'use client';
import React, { useEffect, useState } from 'react';
import AppIcon from './AppIcon';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    let preference: string | null = null;
    try { preference = window.localStorage.getItem('route-planner:theme'); } catch {}
    const next = preference ? preference === 'dark' : Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next); document.documentElement.dataset.theme = next ? 'dark' : 'light';
    try { window.localStorage.setItem('route-planner:theme', next ? 'dark' : 'light'); } catch {}
  }
  return <button type="button" className="theme-toggle" aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} aria-pressed={dark} onClick={toggle}><AppIcon name={dark ? 'sun' : 'moon'}/></button>;
}
