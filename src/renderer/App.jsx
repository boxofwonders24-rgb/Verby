import React, { useState, useEffect } from 'react';
import Overlay from './components/Overlay';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [view, setView] = useState('main');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    window.verby.getSettings().then((s) => {
      if (s.theme) setTheme(s.theme);
    });
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.verby.setSetting('theme', next);
  };

  return (
    <div className={`h-screen w-screen bg-transparent flex items-center justify-center ${theme === 'light' ? 'light' : ''}`}>
      {view === 'main' && (
        <Overlay
          onOpenSettings={() => setView('settings')}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
      {view === 'settings' && (
        <div className="w-[640px] rounded-3xl overflow-hidden"
          style={{
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(40px)',
            border: '1px solid var(--border)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          }}>
          <SettingsPanel onBack={() => setView('main')} />
        </div>
      )}
    </div>
  );
}
