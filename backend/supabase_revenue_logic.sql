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
  add column if not exists level integer not null default 0,
  add column if not exists referral_code text;

create unique index if not exists profiles_device_fingerprint_idx
  on public.profiles (device_fingerprint)
  where device_fingerprint is not null;

create unique index if not exists profiles_referral_code_idx
  on public.profiles (referral_code)
  where referral_code is not null;

update public.profiles
set referral_code = upper(substr(replace(id::text, '-', ''), 1, 10))
where referral_code is null;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  points_reward integer not null default 0,
  task_type text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.tasks
  drop constraint if exists tasks_task_type_check;

alter table public.tasks
  add constraint tasks_task_type_check
  check (task_type in ('ptc', 'shortlink', 'passive_ad', 'offerwall'))
  not valid;

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
  add column if not exists total_earnings numeric not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

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
  inventory_id uuid,
  ecard_pin text,
  claimed_at timestamptz,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint withdrawals_gift_card_tier_check
    check (
      payout_type = 'gift_card'
      and (
        (requested_amount = 400 and gift_card_robux = 400 and gift_card_value_usd = 5)
        or (requested_amount = 800 and gift_card_robux = 800 and gift_card_value_usd = 10)
      )
    )
);

alter table public.withdrawals
  add column if not exists payout_type text not null default 'gift_card',
  add column if not exists gift_card_robux integer,
  add column if not exists gift_card_value_usd numeric,
  add column if not exists inventory_id uuid,
  add column if not exists ecard_pin text,
  add column if not exists claimed_at timestamptz,
  drop column if exists gamepass_target_price,
  drop column if exists gamepass_asset_id,
  drop column if exists place_id;

alter table public.withdrawals
  drop constraint if exists withdrawals_gift_card_tier_check;

alter table public.withdrawals
  add constraint withdrawals_gift_card_tier_check
  check (
    payout_type = 'gift_card'
    and (
      (requested_amount = 400 and gift_card_robux = 400 and gift_card_value_usd = 5)
      or (requested_amount = 800 and gift_card_robux = 800 and gift_card_value_usd = 10)
    )
  )
  not valid;

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

insert into public.tasks (title, description, points_reward, task_type, is_active)
select 'Offerwall Completion', 'Allowed CPI, quiz, poll, or short video offerwall completion', 1, 'offerwall', true
where not exists (select 1 from public.tasks where task_type = 'offerwall' and is_active = true);

create table if not exists public.gift_card_inventory (
  id uuid primary key default gen_random_uuid(),
  gift_card_robux integer not null check (gift_card_robux in (400, 800)),
  gift_card_value_usd numeric not null check (gift_card_value_usd in (5, 10)),
  ecard_pin text not null unique,
  status text not null default 'available' check (status in ('available', 'reserved', 'claimed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  withdrawal_id uuid,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create index if not exists gift_card_inventory_available_idx
  on public.gift_card_inventory (gift_card_robux, status, created_at);

create table if not exists public.offerwall_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  category text not null check (category in ('cpi_mobile_launch', 'micro_quiz', 'profiler_poll', 'short_video')),
  transaction_id text not null,
  ad_payout_value numeric not null default 0,
  credited_points numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (provider, transaction_id)
);

create table if not exists public.referral_earnings (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  source_completion_id uuid references public.task_completions(id) on delete set null,
  base_earnings numeric not null default 0,
  commission_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists referral_earnings_referrer_created_at_idx
  on public.referral_earnings (referrer_id, created_at desc);

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
  total_earnings numeric default 0,
  completion_metadata jsonb default '{}'::jsonb
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
  referrer_id uuid;
  referral_commission numeric;
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
    when 'offerwall' then 100
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
    and tc.completed_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc')
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
    total_earnings,
    metadata
  )
  values (
    target_user_id,
    selected_task_id,
    'completed',
    coalesce(base_earnings, 0),
    coalesce(bonus_earnings, 0),
    coalesce(total_earnings, 0),
    coalesce(completion_metadata, '{}'::jsonb)
  )
  returning id into completion_id;

  update public.profiles
  set
    robux_balance = coalesce(robux_balance, 0) + coalesce(total_earnings, 0),
    updated_at = now()
  where id = target_user_id;

  select referred_by
  into referrer_id
  from public.profiles
  where id = target_user_id;

  referral_commission := round(coalesce(base_earnings, 0) * 0.10, 4);

  if referrer_id is not null and referral_commission > 0 then
    update public.profiles
    set
      robux_balance = coalesce(robux_balance, 0) + referral_commission,
      updated_at = now()
    where id = referrer_id;

    insert into public.referral_earnings (
      referrer_id,
      referred_user_id,
      source_completion_id,
      base_earnings,
      commission_amount
    )
    values (
      referrer_id,
      target_user_id,
      completion_id,
      coalesce(base_earnings, 0),
      referral_commission
    );
  end if;

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

create or replace function public.redeem_gift_card(target_user_id uuid, tier_points numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance numeric;
  tier_robux integer;
  tier_value numeric;
  inventory_row public.gift_card_inventory%rowtype;
  redeemed_withdrawal_id uuid;
begin
  if tier_points not in (400, 800) then
    return jsonb_build_object('success', false, 'error', 'Invalid Gift Card tier.');
  end if;

  tier_robux := tier_points::integer;
  tier_value := case tier_points when 400 then 5 when 800 then 10 end;

  select robux_balance
  into current_balance
  from public.profiles
  where id = target_user_id
  for update;

  if current_balance is null then
    return jsonb_build_object('success', false, 'error', 'User profile not found.');
  end if;

  if current_balance < 400 then
    return jsonb_build_object('success', false, 'error', 'Gift Card redemption requires at least 400 points.');
  end if;

  if current_balance < tier_points then
    return jsonb_build_object('success', false, 'error', 'Insufficient points for selected Gift Card tier.');
  end if;

  select *
  into inventory_row
  from public.gift_card_inventory
  where gift_card_robux = tier_robux
    and status = 'available'
  order by created_at
  limit 1
  for update skip locked;

  if inventory_row.id is null then
    return jsonb_build_object('success', false, 'error', 'Gift Card stock is currently unavailable.');
  end if;

  insert into public.withdrawals (
    user_id,
    requested_amount,
    payout_type,
    gift_card_robux,
    gift_card_value_usd,
    inventory_id,
    ecard_pin,
    claimed_at,
    status
  )
  values (
    target_user_id,
    tier_points,
    'gift_card',
    tier_robux,
    tier_value,
    inventory_row.id,
    inventory_row.ecard_pin,
    now(),
    'fulfilled'
  )
  returning id into redeemed_withdrawal_id;

  update public.gift_card_inventory
  set
    status = 'claimed',
    assigned_to = target_user_id,
    withdrawal_id = redeemed_withdrawal_id,
    claimed_at = now()
  where id = inventory_row.id;

  update public.profiles
  set
    robux_balance = robux_balance - tier_points,
    updated_at = now()
  where id = target_user_id;

  return jsonb_build_object(
    'success', true,
    'withdrawalId', redeemed_withdrawal_id,
    'giftCardRobux', tier_robux,
    'giftCardValueUsd', tier_value,
    'ecardPin', inventory_row.ecard_pin
  );
end;
$$;

create or replace function public.ensure_user_profile(
  target_user_id uuid,
  target_username text,
  incoming_referral_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_code text;
  referrer_id uuid;
begin
  generated_code := upper(substr(replace(target_user_id::text, '-', ''), 1, 10));

  if incoming_referral_code is not null then
    select id
    into referrer_id
    from public.profiles
    where referral_code = upper(trim(incoming_referral_code))
       or id::text = incoming_referral_code
    limit 1;
  end if;

  insert into public.profiles (id, username, referral_code, referred_by)
  values (
    target_user_id,
    coalesce(nullif(target_username, ''), 'RoEarn User'),
    generated_code,
    referrer_id
  )
  on conflict (id) do update
  set
    username = excluded.username,
    referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
    referred_by = coalesce(public.profiles.referred_by, excluded.referred_by),
    updated_at = now();

  return jsonb_build_object(
    'success', true,
    'referralCode', generated_code,
    'referredBy', referrer_id
  );
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_user_profile(
    new.id,
    coalesce(new.raw_user_meta_data->>'roblox_username', new.email),
    new.raw_user_meta_data->>'referrer_code'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.get_referral_stats(target_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'referralCode', coalesce((select referral_code from public.profiles where id = target_user_id), ''),
    'referredUsers', (
      select count(*)
      from public.profiles
      where referred_by = target_user_id
    ),
    'passivePointsEarned', (
      select coalesce(sum(commission_amount), 0)
      from public.referral_earnings
      where referrer_id = target_user_id
    )
  );
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
