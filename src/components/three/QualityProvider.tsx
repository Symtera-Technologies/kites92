'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  defaultQuality,
  resolveQuality,
  qualityTiers,
  type QualityState,
  type QualityTier,
} from '@/lib/three/quality';

interface QualityContextValue extends QualityState {
  /** Let the visitor force a tier (or clear the override with null). */
  setOverride: (tier: QualityTier | null) => void;
  override: QualityTier | null;
}

const QualityContext = createContext<QualityContextValue>({
  ...defaultQuality,
  setOverride: () => {},
  override: null,
});

const STORAGE_KEY = 'kites92:quality';

/**
 * Resolves render quality once for the whole page.
 *
 * Detection runs in an effect rather than during render so the server HTML and
 * the first client render agree; the scenes then upgrade on the next frame.
 * Doing it during render would read `navigator` on the server and trip a
 * hydration mismatch on every page.
 */
export function QualityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<QualityState>(defaultQuality);
  const [override, setOverrideState] = useState<QualityTier | null>(null);

  useEffect(() => {
    setState(resolveQuality());

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'high' || saved === 'medium' || saved === 'low') {
        setOverrideState(saved);
      }
    } catch {
      // Private mode or blocked storage: the detected tier is a fine default.
    }

    // Respond live when the visitor flips the OS reduced-motion setting,
    // rather than only honouring it on a full reload.
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setState(resolveQuality());
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const setOverride = (tier: QualityTier | null) => {
    setOverrideState(tier);
    try {
      if (tier) window.localStorage.setItem(STORAGE_KEY, tier);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Non-fatal; the override simply will not persist.
    }
  };

  const value = useMemo<QualityContextValue>(() => {
    const tier = override ?? state.tier;
    return {
      ...state,
      tier,
      settings: qualityTiers[tier],
      setOverride,
      override,
    };
  }, [state, override]);

  return <QualityContext.Provider value={value}>{children}</QualityContext.Provider>;
}

export function useQuality() {
  return useContext(QualityContext);
}
