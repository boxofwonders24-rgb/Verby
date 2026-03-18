import React, { useState, useEffect } from 'react';
import { getSettings, setSetting } from '../lib/ipc';

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

export default function SettingsPanel({ onBack }) {
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);
  const [showKeys, setShowKeys] = useState({});

  useEffect(() => {
    getSettings().then((s) => setSettings(s || {}));
  }, []);

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

        {/* ═══ API Keys ═══ */}
        <div>
          <SectionHeader>API Keys</SectionHeader>
          <div className="space-y-3">
            <div>
              <Label hint="Whisper + GPT">OpenAI API Key</Label>
              <div className="relative">
                <input
                  type={showKeys.openai ? 'text' : 'password'}
                  value={settings.openaiKey || ''}
                  onChange={(e) => update('openaiKey', e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-2.5 pr-16 rounded-xl text-sm"
                  style={inputStyle}
                />
                <button
                  onClick={() => toggleKeyVisibility('openai')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-2 py-1 rounded-lg"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showKeys.openai ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div>
              <Label hint="Claude">Anthropic API Key</Label>
              <div className="relative">
                <input
                  type={showKeys.anthropic ? 'text' : 'password'}
                  value={settings.anthropicKey || ''}
                  onChange={(e) => update('anthropicKey', e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full px-4 py-2.5 pr-16 rounded-xl text-sm"
                  style={inputStyle}
                />
                <button
                  onClick={() => toggleKeyVisibility('anthropic')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-2 py-1 rounded-lg"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showKeys.anthropic ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>
        </div>

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
              checked={settings.enhancedMode !== false}
              onChange={(v) => update('enhancedMode', v)}
              label="Enhanced Writing"
              description="AI polishes grammar, clarity & tone before injecting"
            />
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

        {/* ═══ Shortcuts ═══ */}
        <div>
          <SectionHeader>Shortcuts</SectionHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Hold to Dictate</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>System-wide voice input</p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>Fn</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Toggle Recording</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Show window + start/stop</p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>Alt+Space</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Dictation Toggle</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Backup hotkey</p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>Ctrl+Alt+Space</span>
            </div>
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
              checked={settings.launchAtLogin !== false}
              onChange={(v) => update('launchAtLogin', v)}
              label="Launch at Login"
              description="Start Verby when you log in"
            />
            <Toggle
              checked={settings.showInDock !== false}
              onChange={(v) => update('showInDock', v)}
              label="Show in Dock"
              description="Display Verby icon in the macOS dock"
            />
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
            Verby needs these macOS permissions to work. Click to open System Settings.
          </p>
          <div className="space-y-2">
            {[
              { label: 'Microphone', desc: 'Voice recording', section: 'Privacy_Microphone' },
              { label: 'Accessibility', desc: 'Text injection', section: 'Privacy_Accessibility' },
              { label: 'Input Monitoring', desc: 'Fn key capture', section: 'Privacy_ListenEvent' },
            ].map(({ label, desc, section }) => (
              <button
                key={section}
                onClick={() => {
                  if (window.verby && window.verby.log) window.verby.log('open-permissions:' + section);
                  // Open system settings via shell
                  window.open(`x-apple.systempreferences:com.apple.preference.security?${section}`);
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

        {/* ═══ About ═══ */}
        <div className="pt-4 pb-2 text-center" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold gradient-text mb-1">Verby</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            v0.1.0 — Voice to perfect prompts
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Built by Stephen Grandy
          </p>
        </div>
      </div>
    </div>
  );
}
