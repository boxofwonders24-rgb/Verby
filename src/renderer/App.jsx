import React, { useState, useEffect } from 'react';
import Overlay from './components/Overlay';
import SettingsPanel from './components/SettingsPanel';
import { getSettings, setSetting } from './lib/ipc';

export default function App() {
  const [view, setView] = useState('main');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    getSettings().then((s) => {
      if (s && s.theme) setTheme(s.theme);
    });
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setSetting('theme', next);
  };

  return (
    <div
      className={`h-screen w-screen flex flex-col ${theme === 'light' ? 'light' : ''}`}
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Draggable title bar area */}
      <div
        className="h-8 w-full flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' }}
      />

      <div className="flex-1 flex items-start justify-center px-4 pb-4 overflow-hidden">
        {view === 'main' && (
          <Overlay
            onOpenSettings={() => setView('settings')}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}
        {view === 'settings' && (
          <div
            className="w-full max-w-[640px] rounded-2xl overflow-hidden"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <SettingsPanel onBack={() => setView('main')} />
          </div>
        )}
      </div>
    </div>
  );
}
