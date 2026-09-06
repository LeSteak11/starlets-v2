'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LEGACY_SAVE_KEY,
  SAVE_KEY,
  migrateLegacySave,
  newSave,
  parseSave,
  regenerate,
} from '@/lib/game';
import type { Save } from '@/lib/game';
/**
 * Owns the local save: load, migrate, persist, and stay in step with other
 * tabs. Every write re-reads storage first so two tabs cannot clobber each
 * other, and a failed write leaves the previous save untouched.
 */
export function useSave() {
  const [save, setSave] = useState<Save | null>(null);
  const current = useRef<Save | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(0);
  useEffect(() => {
    const initialize = setTimeout(() => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        // Phase 1 playtest saves are migrated forward, never discarded. The
        // legacy key is left in place as a fallback until Phase 2 ships.
        const legacy = raw ? null : localStorage.getItem(LEGACY_SAVE_KEY);
        const loaded = regenerate(
          raw ? parseSave(raw) : legacy ? migrateLegacySave(legacy) : newSave(),
        );
        localStorage.setItem(SAVE_KEY, JSON.stringify(loaded));
        current.current = loaded;
        setSave(loaded);
      } catch {
        setError(
          'Your local save could not be loaded. Enable browser storage or reset the save in Settings to start again. Existing data has been preserved.',
        );
      }
      setNow(Date.now());
    }, 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const sync = (event: StorageEvent) => {
      if (event.key !== SAVE_KEY) return;
      try {
        const s = event.newValue ? parseSave(event.newValue) : newSave();
        current.current = s;
        setSave(s);
      } catch {
        setError(
          'Another tab changed the save to an unreadable format. Reload or reset in Settings.',
        );
      }
    };
    window.addEventListener('storage', sync);
    return () => {
      clearTimeout(initialize);
      clearInterval(timer);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const update = useCallback((operation: (state: Save) => Save) => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const previous = raw ? parseSave(raw) : current.current;
      if (!previous) return;
      const next = operation(previous);
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      current.current = next;
      setSave(next);
      setError('');
    } catch {
      setError(
        'Progress could not be saved. Check browser storage, then retry. This action has not been applied.',
      );
    }
  }, []);
  const restart = useCallback(() => {
    try {
      const s = newSave();
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
      current.current = s;
      setSave(s);
      setError('');
      return true;
    } catch {
      setError(
        'Browser storage is unavailable. Enable it before starting a new save.',
      );
      return false;
    }
  }, []);
  return { save, current, error, now, update, restart };
}
