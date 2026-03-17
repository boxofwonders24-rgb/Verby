import React, { useState, useEffect } from 'react';
import Overlay from './components/Overlay';

export default function App() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    window.verby.getSettings().then((s) => {
      if (s.theme) setTheme(s.theme);
    });
  }, []);

  return (
    <div className={`h-screen w-screen bg-transparent flex items-center justify-center ${theme === 'light' ? 'light' : ''}`}>
      <Overlay />
    </div>
  );
}
