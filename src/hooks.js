import { useEffect, useRef, useState } from 'react';

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
// `lite` runs the 3D scene stripped down, `flat` is the static 2D backdrop
// (only when WebGL genuinely can't run). Phones get `lite` + `portrait`
// (centreline camera). `still` keeps the 3D but freezes every autonomous
// animation — used for prefers-reduced-motion, which on iOS also covers Low
// Power Mode. Those visitors were getting the flat fallback before.
const PARAMS = new URLSearchParams(
  typeof window !== 'undefined' ? window.location.search : '',
);
const TIER_OVERRIDE = PARAMS.get('tier'); // ?tier=flat|lite|full
const STILL_OVERRIDE = PARAMS.has('still'); // ?still — force the frozen scene

export function useDeviceTier() {
  const reduced = useReducedMotion() || STILL_OVERRIDE;
  const small = useMediaQuery('(max-width: 720px)');
  const [state, setState] = useState(() => ({
    tier: TIER_OVERRIDE || 'full',
    still: STILL_OVERRIDE,
  }));

  useEffect(() => {
    if (TIER_OVERRIDE) return setState({ tier: TIER_OVERRIDE, still: reduced });

    let gl = null;
    try {
      gl = document.createElement('canvas').getContext('webgl2');
    } catch {
      gl = null;
    }
    const cores = navigator.hardwareConcurrency || 8;
    const mem = navigator.deviceMemory || 8;

    // three r0.171 is WebGL2-only, so no context (or a genuinely weak device)
    // means the static 2D backdrop — there's no lighter 3D path to offer.
    if (!gl || cores <= 2 || mem <= 2) {
      setState({ tier: 'flat', still: reduced });
      return;
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    // capable: phones + modest laptops get the stripped scene, the rest full.
    const tier = small || cores <= 4 || mem <= 4 ? 'lite' : 'full';
    setState({ tier, still: reduced });
  }, [reduced, small]);

  return state;
}

// Pointer position in normalised [-1, 1] space. `tx/ty` is the live target;
// the scene's frame loop eases `x/y` toward it (parallax lag) so the smoothing
// runs on the same clock as the render and stops when it does. Touch: no-op.
export function usePointer() {
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const onMove = (e) => {
      pointer.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
  return pointer;
}
