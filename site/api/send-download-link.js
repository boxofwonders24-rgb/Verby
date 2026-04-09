// Sends a download link email to mobile visitors who submitted their email
// Called from the mobile capture form on verbyai.com

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  // Store in Supabase
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from('email_leads').insert({
      email,
      source: req.headers.referer || 'direct',
      utm_source: req.body.utm_source || null,
    });
  } catch (e) {
    // Don't block email send if Supabase fails
  }

  // Send email via Resend (if API key exists) or fall back to no-send
  if (RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Verby <hello@syntrixdev.com>',
          to: email,
          subject: 'Your Verby Download Link',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 28px; font-weight: 800; color: #1a1a2e; margin: 0;">Verby</h1>
                <p style="color: #666; margin-top: 4px;">Voice → Structured Text</p>
              </div>

              <p style="font-size: 16px; color: #333; line-height: 1.6;">Hey! Here's your download link for Verby:</p>

              <div style="margin: 24px 0;">
                <p style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px;">Mac (Apple Silicon — M1/M2/M3):</p>
                <a href="https://github.com/boxofwonders24-rgb/Verby/releases/download/v0.7.2/VerbyPrompt-0.7.2-arm64.dmg" style="display: inline-block; padding: 12px 24px; background: #6366F1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Download for Apple Silicon</a>
              </div>

              <div style="margin: 24px 0;">
                <p style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px;">Mac (Intel):</p>
                <a href="https://github.com/boxofwonders24-rgb/Verby/releases/download/v0.7.2/VerbyPrompt-0.7.2.dmg" style="display: inline-block; padding: 12px 24px; background: #6366F1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Download for Intel Mac</a>
              </div>

              <div style="margin: 24px 0;">
                <p style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px;">Windows:</p>
                <a href="https://github.com/boxofwonders24-rgb/Verby/releases/download/v0.7.2/VerbyPrompt-Setup-0.7.2.exe" style="display: inline-block; padding: 12px 24px; background: #6366F1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Download for Windows</a>
              </div>

              <div style="margin-top: 32px; padding: 20px; background: #f8f9fa; border-radius: 12px;">
                <p style="font-size: 14px; color: #333; margin: 0; font-weight: 600;">Quick Setup:</p>
                <ol style="font-size: 14px; color: #555; line-height: 1.8; padding-left: 20px; margin-top: 8px;">
                  <li>Open the downloaded file and drag Verby to Applications</li>
                  <li>Right-click Verby → Open (first time only)</li>
                  <li>Grant microphone + accessibility permissions when prompted</li>
                  <li>Hold Fn and speak — you're live!</li>
                </ol>
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 24px; line-height: 1.6;">You get 20 free prompts every day. No credit card needed.</p>

              <p style="font-size: 14px; color: #666; margin-top: 16px;">Questions? Reply to this email — I read every one.</p>

              <p style="font-size: 14px; color: #333; margin-top: 16px;">— Stephen, Verby</p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
              <p style="font-size: 12px; color: #999; text-align: center;">
                <a href="https://verbyai.com" style="color: #6366F1; text-decoration: none;">verbyai.com</a> · Built by <a href="https://syntrixdev.com" style="color: #6366F1; text-decoration: none;">Syntrix</a>
              </p>
            </div>
          `,
        }),
      });
    } catch (e) {
      // Email send failed — lead is still stored in Supabase
    }
  }

  return res.status(200).json({ success: true });
}
