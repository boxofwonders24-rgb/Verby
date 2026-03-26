import React, { useState } from 'react';
import { authSendMagicLink, authVerifyOtp, authSignInOAuth } from '../lib/ipc';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
    <path d="M14.94 9.88c-.02-2.15 1.75-3.18 1.83-3.23-1-1.46-2.55-1.66-3.1-1.68-1.32-.13-2.57.78-3.24.78-.67 0-1.7-.76-2.8-.74-1.44.02-2.77.84-3.51 2.13-1.5 2.6-.38 6.45 1.08 8.56.71 1.03 1.56 2.19 2.68 2.15 1.07-.04 1.48-.7 2.78-.7 1.3 0 1.67.7 2.78.67 1.16-.02 1.89-1.05 2.6-2.08.82-1.2 1.16-2.35 1.18-2.41-.03-.01-2.26-.87-2.28-3.45zM12.82 3.35c.59-.72 1-1.72.89-2.72-.86.04-1.9.57-2.51 1.3-.55.64-1.03 1.65-.9 2.63.96.07 1.93-.49 2.52-1.21z"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
    <path d="M9 0C4.03 0 0 4.03 0 9c0 3.98 2.58 7.35 6.16 8.54.45.08.62-.2.62-.43v-1.5c-2.51.54-3.04-1.21-3.04-1.21-.41-1.04-1-1.32-1-1.32-.82-.56.06-.55.06-.55.9.06 1.38.93 1.38.93.8 1.37 2.1.98 2.62.75.08-.58.31-.98.57-1.2-2-.23-4.1-1-4.1-4.45 0-.98.35-1.79.93-2.42-.09-.23-.4-1.14.09-2.38 0 0 .76-.24 2.48.93a8.64 8.64 0 014.52 0c1.72-1.17 2.48-.93 2.48-.93.49 1.24.18 2.15.09 2.38.58.63.93 1.44.93 2.42 0 3.46-2.1 4.22-4.11 4.44.32.28.61.83.61 1.67v2.48c0 .24.16.52.62.43A9 9 0 0018 9c0-4.97-4.03-9-9-9z"/>
  </svg>
);

function OAuthButton({ icon, label, provider, onClick }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onClick(provider);
    } catch (err) {
      console.error(`${provider} sign-in failed:`, err);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium transition-all"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {icon}
      {loading ? 'Opening...' : label}
    </button>
  );
}

export default function SignIn({ onSignedIn }) {
  const [step, setStep] = useState('choose'); // choose | email | code
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const handleOAuth = async (provider) => {
    setError('');
    try {
      await authSignInOAuth(provider);
      // Browser opens — user completes OAuth there
      // Deep link callback will trigger auth-state-changed
    } catch (err) {
      setError(err.message || `${provider} sign-in failed`);
    }
  };

  const handleSendLink = async (e) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    setSending(true);
    setError('');
    try {
      await authSendMagicLink(email);
      setStep('code');
    } catch (err) {
      setError(err.message || 'Failed to send code');
    }
    setSending(false);
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (code.length < 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    setSending(true);
    setError('');
    try {
      const result = await authVerifyOtp(email, code);
      if (result.isAuthenticated) {
        onSignedIn(result);
      } else {
        setError('Verification failed. Try again.');
      }
    } catch (err) {
      setError(err.message || 'Invalid code');
    }
    setSending(false);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-[360px] text-center">
        {/* Logo */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold gradient-text mb-1">Verby</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Voice to text, everywhere
          </p>
        </div>

        {/* === Choose method === */}
        {step === 'choose' && (
          <div className="space-y-3">
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
              Sign in to get started
            </p>

            <OAuthButton
              icon={<GoogleIcon />}
              label="Continue with Google"
              provider="google"
              onClick={handleOAuth}
            />
            <OAuthButton
              icon={<AppleIcon />}
              label="Continue with Apple"
              provider="apple"
              onClick={handleOAuth}
            />
            <OAuthButton
              icon={<GitHubIcon />}
              label="Continue with GitHub"
              provider="github"
              onClick={handleOAuth}
            />

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            <button
              onClick={() => setStep('email')}
              className="w-full py-3 rounded-xl text-sm font-medium"
              style={{
                background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))',
                color: '#fff',
                boxShadow: '0 2px 10px var(--accent-glow)',
              }}
            >
              Sign in with Email
            </button>

            {error && (
              <p className="text-[11px]" style={{ color: 'var(--error)' }}>{error}</p>
            )}
          </div>
        )}

        {/* === Email entry === */}
        {step === 'email' && (
          <form onSubmit={handleSendLink} className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                Sign in with email
              </p>
              <p className="text-[11px] mb-4" style={{ color: 'var(--text-secondary)' }}>
                We'll send a 6-digit code to your email. No password needed.
              </p>
            </div>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))',
                color: '#fff',
                boxShadow: '0 2px 10px var(--accent-glow)',
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? 'Sending...' : 'Send Sign-In Code'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('choose'); setError(''); }}
              className="text-[11px] font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              Back to sign-in options
            </button>

            {error && (
              <p className="text-[11px]" style={{ color: 'var(--error)' }}>{error}</p>
            )}
          </form>
        )}

        {/* === OTP code entry === */}
        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Check your email
              </p>
              <p className="text-[11px] mb-1" style={{ color: 'var(--text-secondary)' }}>
                We sent a 6-digit code to
              </p>
              <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{email}</p>
            </div>

            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoFocus
              maxLength={6}
              className="w-full px-4 py-3 rounded-xl text-center text-lg font-mono tracking-[0.3em]"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />

            <button
              type="submit"
              disabled={sending || code.length < 6}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))',
                color: '#fff',
                boxShadow: '0 2px 10px var(--accent-glow)',
                opacity: (sending || code.length < 6) ? 0.7 : 1,
              }}
            >
              {sending ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); setError(''); }}
              className="text-[11px] font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              Use a different email
            </button>

            {error && (
              <p className="text-[11px]" style={{ color: 'var(--error)' }}>{error}</p>
            )}
          </form>
        )}

        <p className="text-[10px] mt-6" style={{ color: 'var(--text-muted)' }}>
          By signing in, you agree to Verby's terms of service
        </p>
      </div>
    </div>
  );
}
