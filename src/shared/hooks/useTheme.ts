'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Mode } from '@/shared/lib/theme/themes';
const MODE_KEY = 'mode';
const readMode = (): Mode => {
  if (typeof document === 'undefined') return 'light';
  const applied = document.documentElement.dataset.mode;
  if (applied === 'dark' || applied === 'light') return applied;
  try { return localStorage.getItem(MODE_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
};
const applyMode = (next: Mode) => {
  const root = document.documentElement;
  root.dataset.mode = next;
  root.style.colorScheme = next;
  root.classList.toggle('is-dark', next === 'dark');
  try { localStorage.setItem(MODE_KEY, next); localStorage.removeItem('theme'); }
  catch { document.cookie = `${MODE_KEY}=${next};path=/;max-age=31536000;SameSite=Lax`; }
};
export function useTheme() {
  const [mode, setModeState] = useState<Mode>('light');
  useEffect(() => {
    const sync = () => setModeState(readMode());
    const storage = (event: StorageEvent) => { if (event.key === MODE_KEY) { const next = event.newValue === 'dark' ? 'dark' : 'light'; applyMode(next); setModeState(next); } };
    sync(); addEventListener('storage', storage); addEventListener('site-mode-change', sync); addEventListener('pageshow', sync);
    return () => { removeEventListener('storage', storage); removeEventListener('site-mode-change', sync); removeEventListener('pageshow', sync); };
  }, []);
  const setMode = useCallback((next: Mode) => { applyMode(next); setModeState(next); dispatchEvent(new CustomEvent('site-mode-change', { detail: next })); }, []);
  const toggleMode = useCallback(() => setMode(readMode() === 'dark' ? 'light' : 'dark'), [setMode]);
  return { mode, setMode, toggleMode };
}
