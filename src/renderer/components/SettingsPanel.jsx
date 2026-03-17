import React, { useState, useEffect } from 'react';
import { getSettings, setSetting } from '../lib/ipc';

export default function SettingsPanel({ onBack }) {
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((s) => setSettings(s || {}));
  }, []);

  const update = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSetting(key, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-bold gradient-text">Settings</h2>
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
        {/* API Keys */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--text-muted)' }}>
            API Keys
          </p>
          <div className="space-y-3">
            <div>
              <label className="flex items-baseline gap-1.5 text-xs mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                OpenAI API Key
                <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>Whisper + GPT</span>
              </label>
              <input
                type="password"
                value={settings.openaiKey || ''}
                onChange={(e) => update('openaiKey', e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="flex items-baseline gap-1.5 text-xs mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                Anthropic API Key
                <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>Claude</span>
              </label>
              <input
                type="password"
                value={settings.anthropicKey || ''}
                onChange={(e) => update('anthropicKey', e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--text-muted)' }}>
            Preferences
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                Default Provider
              </label>
              <div className="flex gap-2">
                {[
                  { key: 'claude', label: 'Claude' },
                  { key: 'openai', label: 'GPT-4o' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => update('defaultProvider', key)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-medium text-center ${settings.defaultProvider === key ? 'active' : ''}`}
                    style={settings.defaultProvider === key
                      ? { background: `linear-gradient(135deg, var(--gradient-1), var(--gradient-2))`, color: '#fff', border: '1px solid transparent', boxShadow: '0 2px 10px var(--accent-glow)' }
                      : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                Global Hotkey
              </label>
              <input
                type="text"
                value={settings.hotkey || 'Alt+Space'}
                onChange={(e) => update('hotkey', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>Restart app after changing</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            VerbyPrompt v0.1.0 — Voice to perfect prompts
          </p>
        </div>
      </div>
    </div>
  );
}
