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

// Coarse capability tiers. `full` gets postprocessing + dense particles,
// `lite` runs the 3D scene stripped down, `flat` is the static 2D backdrop —
// only when WebGL genuinely can't run. Phones get `lite` + `portrait` (the
// centreline camera path). This is a hardware read only, deliberately blind
// to prefers-reduced-motion — that preference is handled separately by the
// `calm` flag in store.js (topbar toggle, seeded from the OS setting), which
// App.jsx also treats as forcing `flat` regardless of what this hook returns.
const TIER_OVERRIDE = new URLSearchParams(
  typeof window !== 'undefined' ? window.location.search : '',
).get('tier');

// What the hardware can do. Fixed for the session and every input is
// synchronous, so this can run before the first paint.
function detectCapability() {
  if (typeof document === 'undefined') return 'full';

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
  if (!gl || cores <= 2 || mem <= 2) return 'flat';
  gl.getExtension('WEBGL_lose_context')?.loseContext();

  // modest laptops get the stripped scene, the rest full.
  return cores <= 4 || mem <= 4 ? 'lite' : 'full';
}

export function useDeviceTier() {
  const small = useMediaQuery('(max-width: 720px)');
  // Resolved in the initializer, not an effect. Deciding after mount meant the
  // first render said 'full', which mounts <Scene> and starts fetching three +
  // r3f (~330 kB gz) on exactly the devices about to be told they get none of
  // it. Viewport is folded in separately since it can change under us.
  const [capability] = useState(detectCapability);

  if (TIER_OVERRIDE) return TIER_OVERRIDE; // ?tier=flat|lite|full, for testing
  if (capability === 'flat') return 'flat';
  return small || capability === 'lite' ? 'lite' : 'full';
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
