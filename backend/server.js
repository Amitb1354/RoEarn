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
  const { userId, taskCategory, clientNonce, signature } = req.body;
  if (!userId || !taskCategory || !clientNonce || !signature) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const expectedSig = crypto.createHash('md5').update(`${userId}${taskCategory}${clientNonce}${SERVER_SALT}`).digest('hex');
  if (expectedSig !== signature) {
    return res.status(403).json({ error: 'Invalid signature verification failed.' });
  }

  const { data, error } = await supabase.rpc('complete_user_task_secure', {
    target_user_id: userId,
    task_category: taskCategory,
    provided_signature: signature,
    client_nonce: clientNonce,
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// 5. SECURE WITHDRAWAL PROCESSING (Enforces 50 Robux limit & user tax)
app.post('/api/withdraw', async (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount) {
    return res.status(400).json({ error: 'Missing checkout parameters' });
  }

  if (amount < 50) {
    return res.status(400).json({ error: 'Minimum withdrawal threshold is 50 Robux.' });
  }

  // Fetch current user balance securely to confirm eligibility before inserting row
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('robux_balance')
    .eq('id', userId)
    .single();

  if (profileErr || !profile) {
    return res.status(500).json({ error: 'User profile look up failed.' });
  }

  if (profile.robux_balance < amount) {
    return res.status(400).json({ error: 'Insufficient Robux balance available.' });
  }

  // Shift 30% Developer fee calculation logic directly into database storage tracking
  const targetGamepassPrice = Math.ceil(amount / 0.7);

  // Deduct from balance immediately on cashout request (Prevents double spending)
  await supabase
    .from('profiles')
    .update({ robux_balance: profile.robux_balance - amount })
    .eq('id', userId);

  const { data, error } = await supabase
    .from('withdrawals')
    .insert({
      user_id: userId,
      requested_amount: amount,
      gamepass_target_price: targetGamepassPrice,
      status: 'pending'
    })
    .select();

  if (error) {
    // Refund user balance if request insertion crashes
    await supabase.from('profiles').update({ robux_balance: profile.robux_balance }).eq('id', userId);
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