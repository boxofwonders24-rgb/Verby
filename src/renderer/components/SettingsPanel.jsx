import React, { useState, useEffect } from 'react';
import { getSettings, setSetting, activateLicense, getUsage, getUpgradeUrl, getAppVersion, onUpdateAvailable, onUpdateProgress, onUpdateDownloaded, onUpdateError, onUpdateBlockedRecording, onUpdateChecking, onUpdateNotAvailable, installUpdate, checkForUpdates, authGetState, authSignOut, getPlatform, openSystemPrefs } from '../lib/ipc';

const SectionHeader = ({ children }) => (
  <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--text-muted)' }}>
    {children}
  </p>
);

const Label = ({ children, hint }) => (
  <label className="flex items-baseline gap-1.5 text-[13px] mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
    {children}
    {hint && <span className="text-[11px] font-normal" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
  </label>
);

const inputStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
    <div className="pr-3">
      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {description && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className="relative w-12 h-7 rounded-full transition-colors flex-shrink-0"
      style={{ background: checked ? 'var(--accent)' : 'var(--bg-card-hover)', border: '1px solid var(--border)' }}
    >
      <div
        className="absolute top-[3px] w-5 h-5 rounded-full transition-all"
        style={{ left: checked ? '25px' : '3px', background: checked ? '#fff' : 'var(--text-muted)' }}
      />
    </button>
  </div>
);

const Divider = () => <div className="section-divider" />;

function ProSection() {
  const [usage, setUsage] = useState({ total: 0, limit: 20, isPro: false });
  const [email, setEmail] = useState('');
  const [activating, setActivating] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    getUsage().then(setUsage);
    getSettings().then((s) => { if (s && s.licenseEmail) setEmail(s.licenseEmail); });
  }, []);

  const handleActivate = async () => {
    if (!email.includes('@')) return;
    setActivating(true);
    setResult(null);
    try {
      const res = await activateLicense(email);
      setResult(res.isPro ? 'Pro activated!' : 'No active subscription found for this email.');
      getUsage().then(setUsage);
    } catch (err) {
      setResult('Error: ' + err.message);
    }
    setActivating(false);
  };

  const handleUpgrade = async () => {
    const url = await getUpgradeUrl();
    if (url) window.open(url);
  };

  return (
    <div>
      <SectionHeader>Plan</SectionHeader>
      {usage.isPro ? (
        <div className="p-5 rounded-xl text-center" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid var(--border-accent)' }}>
          <p className="text-sm font-semibold gradient-text mb-1">Verby Pro</p>
          <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Unlimited dictations & AI enhancement</p>
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>{usage.total} prompts today</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Free Plan</p>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                {usage.total}/{usage.limit} today
              </span>
            </div>
            <div className="w-full h-2 rounded-full mb-4" style={{ background: 'var(--bg-elevated)' }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.min(100, (usage.total / usage.limit) * 100)}%`,
                background: usage.total > usage.limit * 0.8 ? 'var(--error)' : 'var(--accent)',
              }} />
            </div>
            <button onClick={handleUpgrade} className="w-full py-3.5 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))', color: '#fff', boxShadow: '0 2px 10px var(--accent-glow)' }}>
              Upgrade to Pro — $9/mo
            </button>
          </div>

          <div>
            <Label hint="from your Stripe purchase">Activate with email</Label>
            <div className="flex gap-2">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com" className="flex-1 px-3 py-3 rounded-xl text-sm" style={inputStyle} />
              <button onClick={handleActivate} disabled={activating}
                className="px-5 py-3 rounded-xl text-[13px] font-medium"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border-accent)' }}>
                {activating ? '...' : 'Activate'}
              </button>
            </div>
            {result && <p className="text-[12px] mt-2" style={{ color: result.includes('Pro') ? 'var(--success)' : 'var(--error)' }}>{result}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function AccountSection() {
  const [email, setEmail] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    authGetState().then((state) => {
      if (state.email) setEmail(state.email);
    });
  }, []);

  const handleSignOut = async () => {
    if (!confirm('Sign out of Verby? You will need to sign in again to use the app.')) return;
    setSigningOut(true);
    await authSignOut();
    window.location.reload();
  };

  return (
    <div>
      <SectionHeader>Account</SectionHeader>
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Signed in as</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--accent)' }}>{email || '...'}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="px-4 py-2 rounded-lg text-[12px] font-medium"
            style={{ background: 'rgba(244,63,94,0.06)', color: 'var(--error)', border: '1px solid rgba(244,63,94,0.15)' }}
          >
            {signingOut ? '...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPanel({ onBack, onRunSetup }) {
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);
  const [platformInfo, setPlatformInfo] = useState(null);

  useEffect(() => {
    getSettings().then((s) => setSettings(s || {}));
  }, []);

  useEffect(() => {
    getPlatform().then(setPlatformInfo);
  }, []);

  const [appVersion, setAppVersion] = useState('...');
  const [updateState, setUpdateState] = useState('idle');
  const [updateVersion, setUpdateVersion] = useState('');
  const [downloadPercent, setDownloadPercent] = useState(0);

  useEffect(() => {
    getAppVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    const cleanups = [
      onUpdateChecking(() => {
        setUpdateState('checking');
      }),
      onUpdateAvailable((data) => {
        setUpdateVersion(data.version);
        setUpdateState('downloading');
      }),
      onUpdateProgress((data) => {
        setDownloadPercent(data.percent);
      }),
      onUpdateDownloaded((data) => {
        setUpdateVersion(data.version);
        setUpdateState('ready');
      }),
      onUpdateNotAvailable(() => {
        setUpdateState('up-to-date');
      }),
      onUpdateError(() => {
        setUpdateState('error');
      }),
      onUpdateBlockedRecording(() => {
        setUpdateState('blocked');
        setTimeout(() => setUpdateState('ready'), 3000);
      }),
    ];
    return () => cleanups.forEach((fn) => fn && fn());
  }, []);

  const handleInstallUpdate = async () => {
    const result = await installUpdate();
    if (result && result.blocked) {
      setUpdateState('blocked');
      setTimeout(() => setUpdateState('ready'), 3000);
    }
  };

  const handleCheckForUpdates = async () => {
    setUpdateState('checking');
    const result = await checkForUpdates();
    if (result && result.error) {
      setUpdateState('error');
    }
  };

  const update = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSetting(key, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="p-6 smooth-scroll" style={{ maxHeight: '100vh', overflowY: 'auto', paddingBottom: '80px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold gradient-text">Settings</h2>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-[13px] font-medium prompt-reveal" style={{ color: 'var(--success)' }}>
              Saved
            </span>
          )}
          <button onClick={onBack} className="pill-btn" style={{ padding: '8px 18px', fontSize: '13px' }}>Back</button>
        </div>
      </div>

      <div className="space-y-6">

        {/* ═══ Pro Status ═══ */}
        <ProSection />

        <Divider />

        {/* ═══ Voice & Dictation ═══ */}
        <div>
          <SectionHeader>Voice & Dictation</SectionHeader>
          <div className="space-y-2">
            <Toggle
              checked={settings.autoInject !== false}
              onChange={(v) => update('autoInject', v)}
              label="Auto-Paste Text"
              description="Automatically paste text at your cursor after speaking"
            />
            <Toggle
              checked={settings.soundFeedback !== false}
              onChange={(v) => update('soundFeedback', v)}
              label="Sound Effects"
              description="Play a sound when recording starts and stops"
            />
          </div>
        </div>

        <Divider />

        {/* ═══ Email ═══ */}
        <div>
          <SectionHeader>Email</SectionHeader>
          <div className="space-y-3">
            <div>
              <Label>Email Style</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'auto', label: 'Auto', desc: 'Matches your tone' },
                  { key: 'formal', label: 'Formal', desc: 'Professional' },
                  { key: 'casual', label: 'Casual', desc: 'Conversational' },
                  { key: 'direct', label: 'Direct', desc: 'No fluff' },
                ].map(({ key, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => update('emailStyle', key)}
                    className="p-3.5 rounded-xl text-left"
                    style={(settings.emailStyle || 'auto') === key
                      ? { background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)' }
                      : { background: 'var(--bg-card)', border: '1px solid var(--border)' }
                    }
                  >
                    <p className="text-[13px] font-medium" style={{ color: (settings.emailStyle || 'auto') === key ? 'var(--accent)' : 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Sign-off Name</Label>
              <input
                type="text"
                placeholder="Your name"
                value={settings.emailSignOffName || ''}
                onChange={(e) => update('emailSignOffName', e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <Divider />

        {/* ═══ Shortcuts ═══ */}
        <div>
          <SectionHeader>Shortcuts</SectionHeader>
          <div className="space-y-2">
            {(platformInfo?.isMac !== false ? [
              { label: 'Hold to Dictate', desc: 'AI-enhanced writing', key: 'Fn' },
              { label: 'Hold to Dictate', desc: 'Clean speech-to-text', key: 'Ctrl' },
              { label: 'Toggle Recording', desc: 'Show window + start/stop', key: 'Alt+Space' },
            ] : [
              { label: 'Hold to Dictate', desc: 'AI-enhanced writing', key: 'CapsLock' },
              { label: 'Hold to Dictate', desc: 'Clean speech-to-text', key: 'Right Ctrl' },
              { label: 'Toggle Recording', desc: 'Show window + start/stop', key: 'Alt+Space' },
            ]).map(({ label, desc, key }) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
                <span className="text-[12px] font-mono px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>{key}</span>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        {/* ═══ Appearance ═══ */}
        <div>
          <SectionHeader>Appearance</SectionHeader>
          <div className="space-y-2">
            <div>
              <Label>Theme</Label>
              <div className="flex gap-2">
                {[
                  { key: 'dark', label: 'Dark' },
                  { key: 'light', label: 'Light' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => update('theme', key)}
                    className="flex-1 py-3.5 rounded-xl text-[13px] font-medium text-center"
                    style={(settings.theme || 'dark') === key
                      ? { background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border-accent)' }
                      : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Toggle
              checked={settings.launchAtLogin === true}
              onChange={(v) => update('launchAtLogin', v)}
              label="Launch at Login"
              description="Start Verby when you log in"
            />
            {platformInfo?.isMac && (
              <Toggle
                checked={settings.showInDock === true}
                onChange={(v) => update('showInDock', v)}
                label="Show in Dock"
                description="Display Verby icon in the macOS dock"
              />
            )}
          </div>
        </div>

        <Divider />

        {/* ═══ Privacy ═══ */}
        <div>
          <SectionHeader>Privacy</SectionHeader>
          <div className="space-y-2">
            <Toggle
              checked={settings.saveHistory !== false}
              onChange={(v) => update('saveHistory', v)}
              label="Save History"
              description="Store prompts locally for the History tab"
            />
            <button
              onClick={() => {
                if (confirm('Clear all prompt history? This cannot be undone.')) {
                  update('_clearHistory', Date.now());
                }
              }}
              className="w-full py-3 rounded-xl text-[13px] font-medium text-center"
              style={{ background: 'rgba(244,63,94,0.06)', color: 'var(--error)', border: '1px solid rgba(244,63,94,0.15)' }}
            >
              Clear All History
            </button>
          </div>
        </div>

        <Divider />

        {/* ═══ Permissions ═══ */}
        {platformInfo?.isMac && (
          <>
            <div>
              <SectionHeader>Permissions</SectionHeader>
              <div className="space-y-2">
                {[
                  { label: 'Microphone', desc: 'Required for voice recording', section: 'Privacy_Microphone' },
                  { label: 'Accessibility', desc: 'Required for text injection', section: 'Privacy_Accessibility' },
                  { label: 'Input Monitoring', desc: 'Required for Fn key capture', section: 'Privacy_ListenEvent' },
                ].map(({ label, desc, section }) => (
                  <button
                    key={section}
                    onClick={() => openSystemPrefs(section)}
                    className="w-full flex items-center justify-between p-4 rounded-xl text-left"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                    </div>
                    <span className="text-[12px] font-medium" style={{ color: 'var(--accent)' }}>Open</span>
                  </button>
                ))}
              </div>
            </div>
            <Divider />
          </>
        )}

        {/* ═══ Account ═══ */}
        <AccountSection />

        <Divider />

        {/* ═══ About & Updates ═══ */}
        <div className="text-center">
          <p className="text-sm font-semibold gradient-text mb-1">Verby</p>
          <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>
            v{appVersion}
          </p>

          {/* Update states */}
          {updateState === 'checking' && (
            <p className="text-[12px] mb-3" style={{ color: 'var(--accent)' }}>
              Checking for updates...
            </p>
          )}

          {updateState === 'up-to-date' && (
            <p className="text-[12px] mb-3" style={{ color: 'var(--success)' }}>
              You're up to date
            </p>
          )}

          {updateState === 'downloading' && (
            <div className="mb-3">
              <p className="text-[12px] mb-2" style={{ color: 'var(--accent)' }}>
                Downloading v{updateVersion}... {downloadPercent}%
              </p>
              <div className="w-40 mx-auto h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${downloadPercent}%`, background: 'var(--accent)' }} />
              </div>
            </div>
          )}

          {updateState === 'ready' && (
            <div className="mb-3">
              <p className="text-[12px] mb-2" style={{ color: 'var(--success)' }}>
                v{updateVersion} ready to install
              </p>
              <button
                onClick={handleInstallUpdate}
                className="w-full py-3.5 rounded-xl text-[13px] font-semibold"
                style={{ background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))', color: '#fff', boxShadow: '0 2px 10px var(--accent-glow)' }}
              >
                Restart to Update
              </button>
            </div>
          )}

          {updateState === 'blocked' && (
            <p className="text-[12px] mb-3" style={{ color: 'var(--error)' }}>
              Finish recording first, then restart
            </p>
          )}

          {updateState === 'error' && (
            <p className="text-[12px] mb-3" style={{ color: 'var(--error)' }}>
              Update check failed — download manually at verbyai.com
            </p>
          )}

          {/* Check for Updates button — show when idle or after checking */}
          {(updateState === 'idle' || updateState === 'up-to-date' || updateState === 'error') && (
            <button
              onClick={handleCheckForUpdates}
              className="w-full py-3.5 rounded-xl text-[13px] font-medium mb-3"
              style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              Check for Updates
            </button>
          )}

          <button
            onClick={() => {
              setSetting('onboardingComplete', false);
              if (onRunSetup) onRunSetup();
            }}
            className="w-full py-3 rounded-xl text-[13px] font-medium"
            style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Run Setup Again
          </button>

          <p className="text-[11px] mt-4" style={{ color: 'var(--text-muted)' }}>
            Built by Stephen Grandy
          </p>
        </div>

      </div>
    </div>
  );
}
