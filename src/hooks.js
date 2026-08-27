import { useEffect, useRef, useState } from 'react';
import { useFactory } from './store.js';

// Live-updating match for a media query.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export const useReducedMotion = () =>
  useMediaQuery('(prefers-reduced-motion: reduce)');

// Coarse capability tiers. `full` gets postprocessing + dense particles,
// `lite` runs the 3D scene stripped down, `flat` falls back to the calm 2D
// backdrop. Reduced-motion or the manual "calm" toggle both force `flat`.
const TIER_OVERRIDE = new URLSearchParams(
  typeof window !== 'undefined' ? window.location.search : '',
).get('tier');

export function useDeviceTier() {
  const reduced = useReducedMotion();
  const calm = useFactory((s) => s.calmMode);
  const small = useMediaQuery('(max-width: 720px)');
  const [tier, setTier] = useState(TIER_OVERRIDE || 'full');

  useEffect(() => {
    if (TIER_OVERRIDE) return; // ?tier=flat|lite|full forces a mode for testing
    if (reduced || calm) return setTier('flat');
    const cores = navigator.hardwareConcurrency || 8;
    const mem = navigator.deviceMemory || 8;
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl || small || cores <= 2 || mem <= 2) return setTier('flat');
    if (cores <= 4 || mem <= 4) return setTier('lite');
    setTier('full');
  }, [reduced, calm, small]);

  return tier;
}

// Smooth pointer position in normalised [-1, 1] space, lerped for lag.
// Feeds a subtle camera parallax in the 3D scene. No-ops on touch devices.
export function usePointer() {
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const onMove = (e) => {
      pointer.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    let raf;
    const tick = () => {
      const p = pointer.current;
      p.x += (p.tx - p.x) * 0.08;
      p.y += (p.ty - p.y) * 0.08;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove);
    tick();
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return pointer;
}
