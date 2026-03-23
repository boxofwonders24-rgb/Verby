// Shared auth middleware for Vercel serverless functions
// Validates Supabase JWT and enforces server-side rate limits

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FREE_DAILY_LIMIT = 20;

let supabase = null;

function getSupabase() {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

// Validate JWT and return user info
export async function authenticateRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing authorization token', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');
  const sb = getSupabase();

  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  return { user };
}

// Check and increment usage for a user
export async function checkUsage(userId, isEnhanced = false) {
  const sb = getSupabase();
  const today = new Date().toISOString().split('T')[0];

  // Check if user is Pro (has active Stripe subscription)
  const { data: profile } = await sb
    .from('profiles')
    .select('is_pro')
    .eq('id', userId)
    .single();

  if (profile?.is_pro) {
    // Pro users — increment but no limit
    await incrementUsage(sb, userId, today, isEnhanced);
    return { allowed: true, isPro: true };
  }

  // Get today's usage
  const { data: usage } = await sb
    .from('usage')
    .select('total, enhanced')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  const total = usage?.total || 0;

  if (total >= FREE_DAILY_LIMIT) {
    return {
      allowed: false,
      isPro: false,
      reason: `Daily limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to Pro for unlimited.`,
      usage: { total, enhanced: usage?.enhanced || 0, limit: FREE_DAILY_LIMIT },
    };
  }

  // Increment
  await incrementUsage(sb, userId, today, isEnhanced);
  return { allowed: true, isPro: false, usage: { total: total + 1, limit: FREE_DAILY_LIMIT } };
}

async function incrementUsage(sb, userId, date, isEnhanced) {
  const { data: existing } = await sb
    .from('usage')
    .select('id, total, enhanced')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  if (existing) {
    await sb
      .from('usage')
      .update({
        total: existing.total + 1,
        enhanced: isEnhanced ? existing.enhanced + 1 : existing.enhanced,
      })
      .eq('id', existing.id);
  } else {
    await sb.from('usage').insert({
      user_id: userId,
      date,
      total: 1,
      enhanced: isEnhanced ? 1 : 0,
    });
  }
}

// Convenience wrapper: authenticate + check usage
export async function authAndLimit(req, { isEnhanced = false } = {}) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth;

  const usage = await checkUsage(auth.user.id, isEnhanced);
  if (!usage.allowed) return { error: usage.reason, status: 429 };

  return { user: auth.user, usage };
}
