import React, { useState, useEffect } from 'react';
import { getSettings, setSetting, activateLicense, getUsage, getUpgradeUrl, getAppVersion, onUpdateAvailable, onUpdateProgress, onUpdateDownloaded, onUpdateError, onUpdateBlockedRecording, installUpdate, authGetState, authSignOut, getPlatform, openSystemPrefs } from '../lib/ipc';

const SectionHeader = ({ children }) => (
  <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--text-muted)' }}>
    {children}
  </p>
);

const Label = ({ children, hint }) => (
  <label className="flex items-baseline gap-1.5 text-xs mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
    {children}
    {hint && <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
  </label>
);

const inputStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
    <div>
      <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {description && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className="relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ml-3"
      style={{ background: checked ? 'var(--accent)' : 'var(--bg-card-hover)', border: '1px solid var(--border)' }}
    >
      <div
        className="absolute top-[2px] w-4 h-4 rounded-full transition-all"
        style={{ left: checked ? '21px' : '2px', background: checked ? '#fff' : 'var(--text-muted)' }}
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
        <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid var(--border-accent)' }}>
          <p className="text-sm font-semibold gradient-text mb-1">Verby Pro</p>
          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Unlimited dictations & AI enhancement</p>
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>{usage.total} prompts today</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Free Plan</p>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                {usage.total}/{usage.limit} today
              </span>
            </div>
            {/* Usage bar */}
            <div className="w-full h-1.5 rounded-full mb-3" style={{ background: 'var(--bg-elevated)' }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.min(100, (usage.total / usage.limit) * 100)}%`,
                background: usage.total > usage.limit * 0.8 ? 'var(--error)' : 'var(--accent)',
              }} />
            </div>
            <button onClick={handleUpgrade} className="w-full py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))', color: '#fff', boxShadow: '0 2px 10px var(--accent-glow)' }}>
              Upgrade to Pro — $9/mo
            </button>
          </div>

          <div>
            <Label hint="from your Stripe purchase">Activate with email</Label>
            <div className="flex gap-2">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com" className="flex-1 px-3 py-2 rounded-xl text-sm" style={inputStyle} />
              <button onClick={handleActivate} disabled={activating}
                className="px-4 py-2 rounded-xl text-xs font-medium"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border-accent)' }}>
                {activating ? '...' : 'Activate'}
              </button>
            </div>
            {result && <p className="text-[11px] mt-1.5" style={{ color: result.includes('Pro') ? 'var(--success)' : 'var(--error)' }}>{result}</p>}
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
    // App will detect auth change and show sign-in screen
    window.location.reload();
  };

  return (
    <div>
      <SectionHeader>Account</SectionHeader>
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Signed in as</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--accent)' }}>{email || '...'}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="px-3 py-1.5 rounded-lg text-[11px] font-medium"
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
  const [showKeys, setShowKeys] = useState({});
  const [platformInfo, setPlatformInfo] = useState(null);

  useEffect(() => {
    getSettings().then((s) => setSettings(s || {}));
  }, []);

  useEffect(() => {
    getPlatform().then(setPlatformInfo);
  }, []);

  const [appVersion, setAppVersion] = useState('...');
  const [updateState, setUpdateState] = useState('idle'); // idle | available | downloading | ready | error | blocked
  const [updateVersion, setUpdateVersion] = useState('');
  const [downloadPercent, setDownloadPercent] = useState(0);

  useEffect(() => {
    getAppVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    const cleanups = [
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

  const update = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSetting(key, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const toggleKeyVisibility = (key) => {
    setShowKeys((s) => ({ ...s, [key]: !s[key] }));
  };

  return (
    <div className="p-6 smooth-scroll" style={{ maxHeight: '100vh', overflowY: 'auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold gradient-text">Settings</h2>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-xs font-medium prompt-reveal" style={{ color: 'var(--success)' }}>
              Saved
            </span>
          )}
          <button onClick={onBack} className="pill-btn">Back</button>
        </div>
      </div>

      <div className="space-y-6">

        {/* ═══ Pro Status ═══ */}
        <ProSection />

        <Divider />

        {/* ═══ Advanced (API Keys) — hidden by default ═══ */}
        <details className="glass-card-sm">
          <summary className="p-3 text-[11px] font-medium cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            Advanced — Use Your Own API Keys
          </summary>
          <div className="px-3 pb-3 space-y-3">
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Optional. Verby works without API keys. Add your own for faster processing or to use your own quota.
            </p>
            <div>
              <Label hint="Whisper + GPT">OpenAI API Key</Label>
              <input
                type="password"
                value={settings.openaiKey || ''}
                onChange={(e) => update('openaiKey', e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={inputStyle}
              />
            </div>
            <div>
              <Label hint="Claude">Anthropic API Key</Label>
              <input
                type="password"
                value={settings.anthropicKey || ''}
                onChange={(e) => update('anthropicKey', e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={inputStyle}
              />
            </div>
          </div>
        </details>

        <Divider />

        {/* ═══ AI Provider ═══ */}
        <div>
          <SectionHeader>AI Provider</SectionHeader>
          <div className="space-y-3">
            <div>
              <Label>Default Provider</Label>
              <div className="flex gap-2">
                {[
                  { key: 'claude', label: 'Claude', desc: 'Best for prompts' },
                  { key: 'openai', label: 'GPT-4o', desc: 'Fast & versatile' },
                ].map(({ key, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => update('defaultProvider', key)}
                    className="flex-1 py-3 rounded-xl text-center transition-all"
                    style={settings.defaultProvider === key
                      ? { background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))', color: '#fff', border: '1px solid transparent', boxShadow: '0 2px 10px var(--accent-glow)' }
                      : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                    }
                  >
                    <span className="text-xs font-medium block">{label}</span>
                    <span className="text-[10px] opacity-70">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Divider />

        {/* ═══ Voice & Dictation ═══ */}
        <div>
          <SectionHeader>Voice & Dictation</SectionHeader>
          <div className="space-y-2">
            <Toggle
              checked={settings.autoInject !== false}
              onChange={(v) => update('autoInject', v)}
              label="Auto-Inject Text"
              description="Paste text at cursor after transcription"
            />
            <Toggle
              checked={settings.soundFeedback !== false}
              onChange={(v) => update('soundFeedback', v)}
              label="Sound Feedback"
              description="Play a subtle sound when recording starts/stops"
            />
            <div className="mt-3">
              <Label hint="seconds">Minimum Recording Duration</Label>
              <div className="flex gap-2">
                {[
                  { key: '0.5', label: '0.5s' },
                  { key: '1', label: '1s' },
                  { key: '2', label: '2s' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => update('minDuration', key)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium"
                    style={(settings.minDuration || '0.5') === key
                      ? { background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border-accent)' }
                      : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Divider />

        {/* ═══ Email ═══ */}
        <div>
          <SectionHeader>Email</SectionHeader>
          <div className="space-y-3">
            <div>
              <Label hint="tone for generated emails">Email Style</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'auto', label: 'Auto', desc: 'Matches your speaking tone' },
                  { key: 'formal', label: 'Formal', desc: 'Professional and polished' },
                  { key: 'casual', label: 'Casual', desc: 'Warm and conversational' },
                  { key: 'direct', label: 'Direct', desc: 'Concise, no fluff' },
                ].map(({ key, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => update('emailStyle', key)}
                    className="p-2.5 rounded-xl text-left"
                    style={(settings.emailStyle || 'auto') === key
                      ? { background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)' }
                      : { background: 'var(--bg-card)', border: '1px solid var(--border)' }
                    }
                  >
                    <p className="text-xs font-medium" style={{ color: (settings.emailStyle || 'auto') === key ? 'var(--accent)' : 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label hint="used at the end of generated emails">Sign-off Name</Label>
              <input
                type="text"
                placeholder="Your name"
                value={settings.emailSignOffName || ''}
                onChange={(e) => update('emailSignOffName', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs"
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
              { label: 'Dictation Toggle', desc: 'Backup hotkey', key: 'Ctrl+Alt+Space' },
            ] : [
              { label: 'Hold to Dictate', desc: 'AI-enhanced writing', key: 'CapsLock' },
              { label: 'Hold to Dictate', desc: 'Clean speech-to-text', key: 'Right Ctrl' },
              { label: 'Toggle Recording', desc: 'Show window + start/stop', key: 'Alt+Space' },
              { label: 'Dictation Toggle', desc: 'Backup hotkey', key: 'Ctrl+Alt+Space' },
            ]).map(({ label, desc, key }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>{key}</span>
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
                  { key: 'dark', label: 'Dark', icon: '🌙' },
                  { key: 'light', label: 'Light', icon: '☀️' },
                ].map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => update('theme', key)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-medium text-center"
                    style={(settings.theme || 'dark') === key
                      ? { background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border-accent)' }
                      : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                    }
                  >
                    {icon} {label}
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
          <SectionHeader>Privacy & Data</SectionHeader>
          <div className="space-y-2">
            <Toggle
              checked={settings.saveHistory !== false}
              onChange={(v) => update('saveHistory', v)}
              label="Save History"
              description="Store prompts locally for the Activity & History tabs"
            />
            <Toggle
              checked={settings.sendAnalytics === true}
              onChange={(v) => update('sendAnalytics', v)}
              label="Usage Analytics"
              description="Help improve Verby — no personal data collected"
            />
            <div className="mt-2">
              <button
                onClick={() => {
                  if (confirm('Clear all prompt history? This cannot be undone.')) {
                    // TODO: wire up clear history IPC
                    update('_clearHistory', Date.now());
                  }
                }}
                className="w-full py-2.5 rounded-xl text-xs font-medium text-center"
                style={{ background: 'rgba(244,63,94,0.06)', color: 'var(--error)', border: '1px solid rgba(244,63,94,0.15)' }}
              >
                Clear All History
              </button>
            </div>
          </div>
        </div>

        <Divider />

        {/* ═══ Permissions ═══ */}
        <div>
          <SectionHeader>Permissions</SectionHeader>
          <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
            {platformInfo?.isMac
              ? 'Verby needs these macOS permissions to work. Click to open System Settings.'
              : 'Verby requests permissions automatically when needed.'}
          </p>
          <div className="space-y-2">
            {[
              { label: 'Microphone', desc: 'Voice recording', section: 'Privacy_Microphone' },
              ...(platformInfo?.isMac ? [
                { label: 'Accessibility', desc: 'Text injection', section: 'Privacy_Accessibility' },
                { label: 'Input Monitoring', desc: 'Fn key capture', section: 'Privacy_ListenEvent' },
              ] : []),
            ].map(({ label, desc, section }) => (
              <button
                key={section}
                onClick={() => {
                  if (window.verby && window.verby.log) window.verby.log('open-permissions:' + section);
                  openSystemPrefs(section);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl text-left"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
                <span className="text-[11px]" style={{ color: 'var(--accent)' }}>Open →</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ Account ═══ */}
        <AccountSection />

        {/* ═══ About ═══ */}
        <div className="pt-4 pb-2 text-center" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold gradient-text mb-1">Verby</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            v{appVersion} — Voice to perfect prompts
          </p>

          {updateState === 'downloading' && (
            <div className="mt-2">
              <p className="text-[10px] mb-1" style={{ color: 'var(--accent)' }}>
                Downloading v{updateVersion}... {downloadPercent}%
              </p>
              <div className="w-32 mx-auto h-1 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${downloadPercent}%`, background: 'var(--accent)' }} />
              </div>
            </div>
          )}

          {updateState === 'ready' && (
            <div className="mt-2">
              <p className="text-[10px] mb-1.5" style={{ color: 'var(--success)' }}>
                v{updateVersion} ready to install
              </p>
              <button
                onClick={handleInstallUpdate}
                className="px-4 py-1.5 rounded-lg text-[11px] font-medium"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border-accent)' }}
              >
                Restart to Update
              </button>
            </div>
          )}

          {updateState === 'blocked' && (
            <p className="text-[10px] mt-2" style={{ color: 'var(--error)' }}>
              Finish recording first, then restart
            </p>
          )}

          {updateState === 'error' && (
            <p className="text-[10px] mt-2" style={{ color: 'var(--error)' }}>
              Update check failed — download manually at verbyai.com
            </p>
          )}

          <Divider />

          <button
            onClick={() => {
              setSetting('onboardingComplete', false);
              if (onRunSetup) onRunSetup();
            }}
            className="w-full py-2.5 rounded-xl text-xs font-medium"
            style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Run Setup Again
          </button>

          <p className="text-[10px] mt-3" style={{ color: 'var(--text-muted)' }}>
            Built by Stephen Grandy
          </p>
        </div>
      </div>
    </div>
  );
}
