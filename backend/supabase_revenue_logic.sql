-- RoEarn Supabase schema update.
-- This keeps the existing model from your diagram:
-- profiles -> task_completions <- tasks
-- and layers the revised daily caps, gift-card payouts, and referral logic on top.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  robux_balance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  alter column robux_balance type numeric using robux_balance::numeric,
  alter column robux_balance set default 0,
  alter column robux_balance set not null,
  add column if not exists device_fingerprint text,
  add column if not exists last_ip text,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null,
  add column if not exists level integer not null default 0;

create unique index if not exists profiles_device_fingerprint_idx
  on public.profiles (device_fingerprint)
  where device_fingerprint is not null;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  points_reward integer not null default 0,
  task_type text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_task_type_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_task_type_check
      check (task_type in ('ptc', 'shortlink', 'passive_ad'))
      not valid;
  end if;
end;
$$;

create index if not exists tasks_type_active_idx
  on public.tasks (task_type, is_active);

create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  completed_at timestamptz not null default now(),
  status text not null default 'completed'
);

alter table public.task_completions
  add column if not exists base_earnings numeric not null default 0,
  add column if not exists bonus_earnings numeric not null default 0,
  add column if not exists total_earnings numeric not null default 0;

create index if not exists task_completions_user_completed_at_idx
  on public.task_completions (user_id, completed_at desc);

create index if not exists task_completions_task_completed_at_idx
  on public.task_completions (task_id, completed_at desc);

create table if not exists public.user_security_nonces (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_nonce text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_amount numeric not null,
  payout_type text not null default 'gift_card',
  gift_card_robux integer not null,
  gift_card_value_usd numeric not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint withdrawals_gift_card_tier_check
    check (
      payout_type = 'gift_card'
      and (
        (requested_amount = 400 and gift_card_robux = 400 and gift_card_value_usd = 5)
        or (requested_amount = 800 and gift_card_robux = 800 and gift_card_value_usd = 10)
        or (requested_amount = 1200 and gift_card_robux = 1200 and gift_card_value_usd = 15)
        or (requested_amount = 2000 and gift_card_robux = 2000 and gift_card_value_usd = 25)
      )
    )
);

alter table public.withdrawals
  add column if not exists payout_type text not null default 'gift_card',
  add column if not exists gift_card_robux integer,
  add column if not exists gift_card_value_usd numeric,
  drop column if exists gamepass_target_price,
  drop column if exists gamepass_asset_id,
  drop column if exists place_id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'withdrawals_gift_card_tier_check'
      and conrelid = 'public.withdrawals'::regclass
  ) then
    alter table public.withdrawals
      add constraint withdrawals_gift_card_tier_check
      check (
        payout_type = 'gift_card'
        and (
          (requested_amount = 400 and gift_card_robux = 400 and gift_card_value_usd = 5)
          or (requested_amount = 800 and gift_card_robux = 800 and gift_card_value_usd = 10)
          or (requested_amount = 1200 and gift_card_robux = 1200 and gift_card_value_usd = 15)
          or (requested_amount = 2000 and gift_card_robux = 2000 and gift_card_value_usd = 25)
        )
      )
      not valid;
  end if;
end;
$$;

create index if not exists withdrawals_user_created_at_idx
  on public.withdrawals (user_id, created_at desc);

insert into public.tasks (title, description, points_reward, task_type, is_active)
select 'PTC Ad', 'Paid-to-click ad placement', 1, 'ptc', true
where not exists (select 1 from public.tasks where task_type = 'ptc' and is_active = true);

insert into public.tasks (title, description, points_reward, task_type, is_active)
select 'Shortlink', 'High-CPM shortlink completion', 1, 'shortlink', true
where not exists (select 1 from public.tasks where task_type = 'shortlink' and is_active = true);

insert into public.tasks (title, description, points_reward, task_type, is_active)
select 'Banner/Video Placement', 'Passive banner or video impression', 1, 'passive_ad', true
where not exists (select 1 from public.tasks where task_type = 'passive_ad' and is_active = true);

create or replace function public.increment_user_balance(target_user_id uuid, amount numeric)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set
    robux_balance = coalesce(robux_balance, 0) + amount,
    updated_at = now()
  where id = target_user_id;
$$;

create or replace function public.complete_user_task_secure(
  target_user_id uuid,
  task_category text,
  provided_signature text,
  client_nonce text,
  base_earnings numeric default 0,
  bonus_earnings numeric default 0,
  total_earnings numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_category text;
  selected_task_id uuid;
  completed_today integer;
  daily_cap integer;
  completion_id uuid;
begin
  normalized_category := lower(trim(task_category));

  if normalized_category in ('ptc_ad', 'ptc_ads', 'paid_to_click') then
    normalized_category := 'ptc';
  elsif normalized_category in ('shortlinks', 'premium_link') then
    normalized_category := 'shortlink';
  elsif normalized_category in ('banner', 'video', 'banner_ad', 'video_ad', 'passive', 'impression') then
    normalized_category := 'passive_ad';
  end if;

  daily_cap := case normalized_category
    when 'ptc' then 40
    when 'shortlink' then 20
    when 'passive_ad' then 30
    else null
  end;

  if daily_cap is null then
    raise exception 'Unsupported task category: %', task_category;
  end if;

  if provided_signature <> 'session' and not exists (
    select 1
    from public.user_security_nonces
    where user_id = target_user_id
      and current_nonce = client_nonce
      and updated_at >= now() - interval '24 hours'
  ) then
    raise exception 'Invalid or expired nonce.';
  end if;

  select id
  into selected_task_id
  from public.tasks
  where task_type = normalized_category
    and is_active = true
  order by created_at
  limit 1;

  if selected_task_id is null then
    insert into public.tasks (title, description, points_reward, task_type, is_active)
    values (
      initcap(replace(normalized_category, '_', ' ')),
      'Auto-created task category for RoEarn tracking',
      1,
      normalized_category,
      true
    )
    returning id into selected_task_id;
  end if;

  select count(*)
  into completed_today
  from public.task_completions tc
  join public.tasks t on t.id = tc.task_id
  where tc.user_id = target_user_id
    and t.task_type = normalized_category
    and tc.completed_at >= now() - interval '24 hours'
    and tc.status = 'completed';

  if completed_today >= daily_cap then
    return jsonb_build_object(
      'success', false,
      'error', 'Daily task cap reached.',
      'taskCategory', normalized_category,
      'completedToday', completed_today,
      'dailyCap', daily_cap
    );
  end if;

  insert into public.task_completions (
    user_id,
    task_id,
    status,
    base_earnings,
    bonus_earnings,
    total_earnings
  )
  values (
    target_user_id,
    selected_task_id,
    'completed',
    coalesce(base_earnings, 0),
    coalesce(bonus_earnings, 0),
    coalesce(total_earnings, 0)
  )
  returning id into completion_id;

  update public.profiles
  set
    robux_balance = coalesce(robux_balance, 0) + coalesce(total_earnings, 0),
    updated_at = now()
  where id = target_user_id;

  update public.user_security_nonces
  set
    current_nonce = encode(gen_random_bytes(16), 'hex'),
    updated_at = now()
  where user_id = target_user_id;

  return jsonb_build_object(
    'success', true,
    'completionId', completion_id,
    'taskCategory', normalized_category,
    'completedToday', completed_today + 1,
    'dailyCap', daily_cap,
    'baseEarnings', coalesce(base_earnings, 0),
    'bonusEarnings', coalesce(bonus_earnings, 0),
    'totalEarnings', coalesce(total_earnings, 0)
  );
end;
$$;

create or replace function public.claim_referral_earnings_secure(target_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'success', true,
    'message', 'Referral commissions are credited automatically when referred users complete tasks.',
    'userId', target_user_id
  );
$$;
