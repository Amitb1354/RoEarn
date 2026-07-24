import express from 'express';
import rateLimit from 'express-rate-limit';
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

const DAILY_TASK_CAPS = {
  ptc: 40,
  shortlink: 20,
  passive_ad: 30,
};

const TASK_PAYOUT_SPLIT = 0.4;
const MAX_LEVEL_BONUS_SPLIT = 0.05;
const REFERRAL_COMMISSION_SPLIT = 0.1;
const DEFAULT_AD_PAYOUT_VALUES = {
  ptc: 0.3,
  shortlink: 0.5,
  passive_ad: 0.1,
};

const GIFT_CARD_TIERS = [
  { robux: 400, cashValue: 5, points: 400 },
  { robux: 800, cashValue: 10, points: 800 },
  { robux: 1200, cashValue: 15, points: 1200 },
  { robux: 2000, cashValue: 25, points: 2000 },
];

const MIN_GIFT_CARD_POINTS = GIFT_CARD_TIERS[0].points;

function normalizeTaskCategory(category) {
  const normalized = String(category || '').toLowerCase().trim();
  if (['ptc', 'ptc_ad', 'ptc_ads', 'paid_to_click'].includes(normalized)) return 'ptc';
  if (['shortlink', 'shortlinks', 'premium_link'].includes(normalized)) return 'shortlink';
  if (['banner', 'video', 'banner_ad', 'video_ad', 'passive', 'passive_ad', 'impression'].includes(normalized)) {
    return 'passive_ad';
  }
  return null;
}

function dailyWindowStart() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
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

// Apply rate limiting without relying on IP address
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  keyGenerator: (req) => req.headers['authorization'] || 'global-limit',
});

app.use(limiter);
app.use(cors());
app.use(express.json());

// 1. GET CLIENT IP (Used by frontend fingerprinting)
app.get('/api/ip', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  res.json({ ip });
});

// 2. NEW USER REGISTRATION WITH FINGERPRINT VERIFICATION
// Prevents players from creating multiple accounts on the same machine
app.post('/api/register', async (req, res) => {
  const { userId, username, deviceFingerprint, referredBy } = req.body;
  if (!userId || !username || !deviceFingerprint) {
    return res.status(400).json({ error: 'Missing registration details' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Insert profile info into Supabase. Unique index handle will auto-reject if fingerprint already exists
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username: username,
      device_fingerprint: deviceFingerprint,
      last_ip: clientIp,
      referred_by: referredBy || null
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
app.get('/api/nonce', async (req, res) => {
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
app.post('/api/complete_task', async (req, res) => {
  const { userId, taskCategory, clientNonce, signature, adPayoutValue } = req.body;
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
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (data?.success === false) {
    return res.status(429).json(data);
  }

  await creditReferralCommission(auth.userId, earnings.baseEarnings);

  res.json({
    ...data,
    taskCategory: normalizedTaskCategory,
    completedToday: completedToday + 1,
    dailyCap,
    earnings,
  });
});

// 5. SECURE WITHDRAWAL PROCESSING (Gift card tiers only)
app.post('/api/withdraw', async (req, res) => {
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

  // Fetch current user balance securely to confirm eligibility before inserting row
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('robux_balance')
    .eq('id', auth.userId)
    .single();

  if (profileErr || !profile) {
    return res.status(500).json({ error: 'User profile look up failed.' });
  }

  if (profile.robux_balance < MIN_GIFT_CARD_POINTS) {
    return res.status(400).json({ error: 'Gift Card redemption requires at least 400 points.' });
  }

  if (profile.robux_balance < selectedTier.points) {
    return res.status(400).json({ error: 'Insufficient points for selected Gift Card tier.' });
  }

  // Deduct from balance immediately on cashout request (Prevents double spending)
  await supabase
    .from('profiles')
    .update({ robux_balance: profile.robux_balance - selectedTier.points })
    .eq('id', auth.userId);

  const { data, error } = await supabase
    .from('withdrawals')
    .insert({
      user_id: auth.userId,
      requested_amount: selectedTier.points,
      payout_type: 'gift_card',
      gift_card_robux: selectedTier.robux,
      gift_card_value_usd: selectedTier.cashValue,
      status: 'pending'
    })
    .select();

  if (error) {
    // Refund user balance if request insertion crashes
    await supabase.from('profiles').update({ robux_balance: profile.robux_balance }).eq('id', auth.userId);
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true, message: 'Cashout request added to execution pipeline.', deployment: data[0] });
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
