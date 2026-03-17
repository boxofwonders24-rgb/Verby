import React, { useState, useEffect } from 'react';
import { getSettings, setSetting } from '../lib/ipc';

export default function SettingsPanel({ onBack }) {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    getSettings().then((s) => setSettings(s || {}));
  }, []);

  const update = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSetting(key, value);
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h2>
        <button onClick={onBack} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Back</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
            OpenAI API Key
          </label>
          <input
            type="password"
            value={settings.openaiKey || ''}
            onChange={(e) => update('openaiKey', e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
            Anthropic API Key
          </label>
          <input
            type="password"
            value={settings.anthropicKey || ''}
            onChange={(e) => update('anthropicKey', e.target.value)}
            placeholder="sk-ant-..."
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
            Default AI Provider
          </label>
          <div className="flex gap-2">
            {['claude', 'openai'].map((p) => (
              <button
                key={p}
                onClick={() => update('defaultProvider', p)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
                style={{
                  background: settings.defaultProvider === p ? 'var(--accent)' : 'transparent',
                  color: settings.defaultProvider === p ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${settings.defaultProvider === p ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
            Global Hotkey
          </label>
          <input
            type="text"
            value={settings.hotkey || ''}
            onChange={(e) => update('hotkey', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={inputStyle}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Restart app after changing hotkey
          </p>
        </div>
      </div>
    </div>
  );
}
