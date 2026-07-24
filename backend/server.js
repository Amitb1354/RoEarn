import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 5000;

// Load env vars
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SERVER_SALT = process.env.SERVER_SALT || 'default_salt_change_me';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Supabase configuration missing. Define SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
app.set('trust proxy', 1);

const DAILY_TASK_CAPS = {
  ptc: 40,
  shortlink: 20,
  passive_ad: 30,
  offerwall: 100,
};

const TASK_PAYOUT_SPLIT = 0.4;
const MAX_LEVEL_BONUS_SPLIT = 0.05;
const REFERRAL_COMMISSION_SPLIT = 0.1;
const DEFAULT_AD_PAYOUT_VALUES = {
  ptc: 0.3,
  shortlink: 0.5,
  passive_ad: 0.1,
  offerwall: 0.25,
};

const GIFT_CARD_TIERS = [
  { robux: 400, cashValue: 5, points: 400 },
  { robux: 800, cashValue: 10, points: 800 },
];

const MIN_GIFT_CARD_POINTS = GIFT_CARD_TIERS[0].points;

function normalizeTaskCategory(category) {
  const normalized = String(category || '').toLowerCase().trim();
  if (['ptc', 'ptc_ad', 'ptc_ads', 'paid_to_click'].includes(normalized)) return 'ptc';
  if (['shortlink', 'shortlinks', 'premium_link'].includes(normalized)) return 'shortlink';
  if (['banner', 'video', 'banner_ad', 'video_ad', 'passive', 'passive_ad', 'impression'].includes(normalized)) {
    return 'passive_ad';
  }
  if (['offerwall', 'cpi', 'quiz', 'poll', 'micro_quiz', 'profiler_poll', 'clip_view'].includes(normalized)) return 'offerwall';
  return null;
}

function dailyWindowStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function calculateLevelBonus(level = 0) {
  const numericLevel = Number(level) || 0;
  return Math.min(MAX_LEVEL_BONUS_SPLIT, Math.max(0, numericLevel) * 0.005);
}

function calculateTaskEarnings(adPayoutValue = 0, level = 0) {
  const baseEarnings = Number(adPayoutValue) * TASK_PAYOUT_SPLIT;
  const bonusEarnings = baseEarnings * calculateLevelBonus(level);
  return {
    baseEarnings,
    bonusEarnings,
    totalEarnings: baseEarnings + bonusEarnings,
  };
}

async function getDailyTaskCount(userId, taskCategory) {
  const { data: tasks, error: taskError } = await supabase
    .from('tasks')
    .select('id')
    .eq('task_type', taskCategory)
    .eq('is_active', true);

  if (taskError) throw taskError;
  if (!tasks?.length) return 0;

  const { count, error } = await supabase
    .from('task_completions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('task_id', tasks.map((task) => task.id))
    .eq('status', 'completed')
    .gte('completed_at', dailyWindowStart());

  if (error) throw error;
  return count || 0;
}

async function creditReferralCommission(userId, baseEarnings) {
  if (!baseEarnings || baseEarnings <= 0) return;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('referred_by')
    .eq('id', userId)
    .single();

  if (profileError || !profile?.referred_by) return;

  const commission = Number((baseEarnings * REFERRAL_COMMISSION_SPLIT).toFixed(4));
  if (commission <= 0) return;

  const { error: incrementError } = await supabase.rpc('increment_user_balance', {
    target_user_id: profile.referred_by,
    amount: commission,
  });

  if (!incrementError) return;

  const { data: referrer } = await supabase
    .from('profiles')
    .select('robux_balance')
    .eq('id', profile.referred_by)
    .single();

  if (!referrer) return;

  await supabase
    .from('profiles')
    .update({ robux_balance: Number(referrer.robux_balance || 0) + commission })
    .eq('id', profile.referred_by);
}

function resolveGiftCardTier(points) {
  return GIFT_CARD_TIERS.find((tier) => tier.points === Number(points));
}

const OFFERWALL_PROVIDERS = [
  {
    id: 'timewall',
    name: 'TimeWall',
    iframeUrl: process.env.TIMEWALL_IFRAME_URL || '',
    categories: ['cpi_mobile_launch', 'micro_quiz', 'profiler_poll', 'short_video'],
  },
  {
    id: 'lootably',
    name: 'Lootably',
    iframeUrl: process.env.LOOTABLY_IFRAME_URL || '',
    categories: ['cpi_mobile_launch', 'micro_quiz', 'profiler_poll', 'short_video'],
  },
  {
    id: 'adgate',
    name: 'AdGate',
    iframeUrl: process.env.ADGATE_IFRAME_URL || '',
    categories: ['cpi_mobile_launch', 'micro_quiz', 'profiler_poll', 'short_video'],
  },
];

const BLOCKED_OFFERWALL_CATEGORIES = ['cpa', 'paid', 'credit_card', 'purchase', 'high_grind_game'];

async function resolveAuthorizedUserId(req, requestedUserId) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return { error: { status: 401, message: 'Invalid user session.' } };
    }
    if (requestedUserId && requestedUserId !== data.user.id) {
      return { error: { status: 403, message: 'User session mismatch.' } };
    }
    return { userId: data.user.id, signedSession: true };
  }

  return { userId: requestedUserId, signedSession: false };
}

function rateLimitKey(req) {
  return (
    req.headers.authorization ||
    req.body?.userId ||
    req.query?.userId ||
    ipKeyGenerator(req.ip || req.socket.remoteAddress || '127.0.0.1')
  );
}

// Apply rate limiting without relying only on IP address
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKey,
});

const authMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKey,
  message: { error: 'Too many account attempts. Please try again later.' },
});

const taskCompletionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKey,
  message: { error: 'Too many task completion attempts. Please slow down.' },
});

const withdrawLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKey,
  message: { error: 'Too many withdrawal attempts. Please try again later.' },
});

const nonceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKey,
  message: { error: 'Too many security nonce requests. Please slow down.' },
});

app.use(limiter);
app.use(cors());
app.use(express.json());

// 1. GET CLIENT IP (Used by frontend fingerprinting)
app.get('/api/ip', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  res.json({ ip });
});

app.get('/api/offerwalls', async (req, res) => {
  const userId = req.headers.authorization?.replace('Bearer ', '') || req.query.userId || '';
  const providers = OFFERWALL_PROVIDERS.map((provider) => ({
    ...provider,
    iframeUrl: provider.iframeUrl
      ? provider.iframeUrl
          .replace('{user_id}', encodeURIComponent(userId))
          .replace('{allowed_categories}', encodeURIComponent(provider.categories.join(',')))
      : '',
    blockedCategories: BLOCKED_OFFERWALL_CATEGORIES,
  }));

  res.json({
    allowedCategories: ['cpi_mobile_launch', 'micro_quiz', 'profiler_poll', 'short_video'],
    blockedCategories: BLOCKED_OFFERWALL_CATEGORIES,
    providers,
  });
});

// 2. NEW USER REGISTRATION WITH FINGERPRINT VERIFICATION
// Prevents players from creating multiple accounts on the same machine
app.post('/api/register', authMutationLimiter, async (req, res) => {
  const { userId, username, deviceFingerprint, referredBy } = req.body;
  if (!userId || !username || !deviceFingerprint) {
    return res.status(400).json({ error: 'Missing registration details' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let referrerId = null;

  if (referredBy) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(referredBy);
    const query = supabase
      .from('profiles')
      .select('id');
    const { data: referrer } = await (isUuid
      ? query.eq('id', referredBy).maybeSingle()
      : query.eq('referral_code', String(referredBy).toUpperCase()).maybeSingle());
    referrerId = referrer?.id || null;
  }

  // Insert profile info into Supabase. Unique index handle will auto-reject if fingerprint already exists
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username: username,
      device_fingerprint: deviceFingerprint,
      last_ip: clientIp,
      referral_code: userId.replaceAll('-', '').slice(0, 10).toUpperCase(),
      referred_by: referrerId
    })
    .select();

  if (error) {
    if (error.code === '23505') { // Postgres code for unique violation
      return res.status(403).json({ error: 'Security Block: This device is already linked to an account.' });
    }
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true, profile: data[0] });
});

// 3. GENERATE ROLLING NONCE
app.get('/api/nonce', nonceLimiter, async (req, res) => {
  const userId = req.headers['authorization'];
  if (!userId) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  const newNonce = crypto.createHash('md5').update(crypto.randomUUID()).digest('hex');
  const { error } = await supabase
    .from('user_security_nonces')
    .upsert({ user_id: userId, current_nonce: newNonce, updated_at: new Date() }, { onConflict: 'user_id' });

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ nonce: newNonce });
});

// 4. SECURE TASK COMPLETION (Validates hash signature, calls RPC)
app.post('/api/complete_task', taskCompletionLimiter, async (req, res) => {
  const { userId, taskCategory, clientNonce, signature, adPayoutValue, metadata = {} } = req.body;
  if (!userId || !taskCategory) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const auth = await resolveAuthorizedUserId(req, userId);
  if (auth.error) {
    return res.status(auth.error.status).json({ error: auth.error.message });
  }

  const normalizedTaskCategory = normalizeTaskCategory(taskCategory);
  if (!normalizedTaskCategory) {
    return res.status(400).json({ error: 'Unsupported task category.' });
  }

  const dailyCap = DAILY_TASK_CAPS[normalizedTaskCategory];
  let completedToday = 0;
  try {
    completedToday = await getDailyTaskCount(auth.userId, normalizedTaskCategory);
  } catch (capError) {
    return res.status(500).json({ error: `Unable to verify daily ${normalizedTaskCategory} cap.` });
  }

  if (completedToday >= dailyCap) {
    return res.status(429).json({
      error: 'Daily task cap reached.',
      taskCategory: normalizedTaskCategory,
      completedToday,
      dailyCap,
    });
  }

  if (!auth.signedSession) {
    if (!clientNonce || !signature) {
      return res.status(400).json({ error: 'Missing signature verification fields.' });
    }

    const expectedSig = crypto.createHash('md5').update(`${auth.userId}${taskCategory}${clientNonce}${SERVER_SALT}`).digest('hex');
    if (expectedSig !== signature) {
      return res.status(403).json({ error: 'Invalid signature verification failed.' });
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.userId)
    .single();

  if (profileError || !profile) {
    return res.status(500).json({ error: 'User profile look up failed.' });
  }

  const payoutValue = Number(adPayoutValue ?? DEFAULT_AD_PAYOUT_VALUES[normalizedTaskCategory]);
  const earnings = calculateTaskEarnings(payoutValue, profile.level);

  const { data, error } = await supabase.rpc('complete_user_task_secure', {
    target_user_id: auth.userId,
    task_category: normalizedTaskCategory,
    provided_signature: signature || 'session',
    client_nonce: clientNonce || `session:${auth.userId}`,
    base_earnings: earnings.baseEarnings,
    bonus_earnings: earnings.bonusEarnings,
    total_earnings: earnings.totalEarnings,
    completion_metadata: metadata,
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (data?.success === false) {
    return res.status(429).json(data);
  }

  res.json({
    ...data,
    taskCategory: normalizedTaskCategory,
    completedToday: completedToday + 1,
    dailyCap,
    earnings,
  });
});

app.post('/api/offerwall/postback', taskCompletionLimiter, async (req, res) => {
  const { userId, provider, category, adPayoutValue, transactionId } = req.body;
  if (!userId || !provider || !category || !transactionId) {
    return res.status(400).json({ error: 'Missing offerwall postback fields.' });
  }

  const normalizedCategory = String(category).toLowerCase().trim();
  if (BLOCKED_OFFERWALL_CATEGORIES.includes(normalizedCategory)) {
    return res.status(403).json({ error: 'Offer category is not allowed.' });
  }

  const allowedCategories = ['cpi_mobile_launch', 'micro_quiz', 'profiler_poll', 'short_video'];
  if (!allowedCategories.includes(normalizedCategory)) {
    return res.status(403).json({ error: 'Unsupported offerwall category.' });
  }

  const payoutValue = Number(adPayoutValue || DEFAULT_AD_PAYOUT_VALUES.offerwall);
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return res.status(500).json({ error: 'User profile look up failed.' });
  }

  const existing = await supabase
    .from('offerwall_events')
    .select('id')
    .eq('provider', provider)
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (existing.data) {
    return res.json({ success: true, duplicate: true });
  }

  const earnings = calculateTaskEarnings(payoutValue, profile.level);
  const { data, error } = await supabase.rpc('complete_user_task_secure', {
    target_user_id: userId,
    task_category: 'offerwall',
    provided_signature: 'session',
    client_nonce: `offerwall:${provider}:${transactionId}`,
    base_earnings: earnings.baseEarnings,
    bonus_earnings: earnings.bonusEarnings,
    total_earnings: earnings.totalEarnings,
    completion_metadata: { provider, category: normalizedCategory, transactionId },
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  await supabase.from('offerwall_events').insert({
    user_id: userId,
    provider,
    category: normalizedCategory,
    transaction_id: transactionId,
    ad_payout_value: payoutValue,
    credited_points: earnings.totalEarnings,
  });

  res.json({ ...data, earnings });
});

// 5. SECURE WITHDRAWAL PROCESSING (Gift card tiers only)
app.post('/api/withdraw', withdrawLimiter, async (req, res) => {
  const { userId, tierPoints } = req.body;
  if (!userId || !tierPoints) {
    return res.status(400).json({ error: 'Missing checkout parameters' });
  }

  const auth = await resolveAuthorizedUserId(req, userId);
  if (auth.error) {
    return res.status(auth.error.status).json({ error: auth.error.message });
  }
  if (!auth.signedSession) {
    return res.status(401).json({ error: 'Authenticated session required for Gift Card redemptions.' });
  }

  const selectedTier = resolveGiftCardTier(tierPoints);
  if (!selectedTier) {
    return res.status(400).json({ error: 'Invalid gift card tier selected.' });
  }

  const { data, error } = await supabase.rpc('redeem_gift_card', {
    target_user_id: auth.userId,
    tier_points: selectedTier.points,
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (data?.success === false) {
    return res.status(400).json(data);
  }

  res.json({ success: true, message: 'Gift Card redeemed.', deployment: data });
});

app.get('/api/withdrawals', async (req, res) => {
  const auth = await resolveAuthorizedUserId(req, req.query.userId);
  if (auth.error) {
    return res.status(auth.error.status).json({ error: auth.error.message });
  }
  if (!auth.signedSession) {
    return res.status(401).json({ error: 'Authenticated session required.' });
  }

  const { data, error } = await supabase
    .from('withdrawals')
    .select('id, requested_amount, gift_card_robux, gift_card_value_usd, status, ecard_pin, claimed_at, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ withdrawals: data || [] });
});

// 6. REFERRAL EARNINGS CLAIM ENDPOINT
app.post('/api/claim_referral', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  const { data, error } = await supabase.rpc('claim_referral_earnings_secure', { target_user_id: userId });
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// 7. STATUS HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RoEarn Engine Running' });
});

app.listen(PORT, () => {
  console.log(`Secure Server Active at: http://localhost:${PORT}`);
});
