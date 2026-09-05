import { lazy, Suspense } from 'react';
import { useFactory } from './store.js';
import { useDeviceTier, useMediaQuery } from './hooks.js';
import HUD from './ui/HUD.jsx';
import Fallback from './ui/Fallback.jsx';

// three + drei + postprocessing are heavy; keep them out of the initial
// bundle so the HUD paints immediately. The 3D is ambient backdrop only —
// the page is fully readable before (and without) it.
const Scene = lazy(() => import('./scene/Scene.jsx'));

// Dev-only: ?inspect=<0-4> swaps the whole app for a single machine on a lit
// turntable (see scene/Inspector.jsx). Not reachable from the shipped UI.
const Inspector = lazy(() => import('./scene/Inspector.jsx'));
const INSPECT =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('inspect')
    : null;

export default function App() {
  const tier = useDeviceTier();
  // Which camera path the scene flies. This is an aspect question, not a width
  // one — three's `fov` is vertical, so only the aspect ratio decides how much
  // of the corridor fits sideways. The landscape keyframes hold every machine
  // in frame down to 1/1 and crop hard below it; the portrait path frames all
  // five at any aspect. See the note above CAMERA_KEYFRAMES_PORTRAIT in
  // data.js. (Was `max-width: 720px`, which is right on a phone but hands a
  // 768x1024 tablet the landscape path at aspect 0.75.)
  const portrait = useMediaQuery('(max-aspect-ratio: 1/1)');
  const section = useFactory((s) => s.section);
  const calm = useFactory((s) => s.calm);

  if (INSPECT !== null) {
    return (
      <div className="app" data-tier="full">
        <div className="canvas-wrap">
          <Suspense fallback={null}>
            <Inspector index={Number(INSPECT) || 0} />
          </Suspense>
        </div>
      </div>
    );
  }

  // `tier` is a hardware-capability signal only (see hooks.js); it never
  // reads prefers-reduced-motion. `calm` is the separate, visitor-facing
  // preference, owned entirely by the topbar toggle (defaults to full motion
  // regardless of the OS setting — see store.js) — and it forces the same
  // static backdrop the flat tier uses, which is what actually stops the
  // 3D's motion (unmounting <Scene> halts its render loop; the CSS-level
  // motion is handled by [data-motion] below).
  const showFallback = tier === 'flat' || calm;

  // `data-backdrop` is what's actually behind the copy, which isn't the same
  // question as `data-tier`: a wide desktop where the visitor has turned the
  // topbar toggle off is still tier 'full' but showing the flat backdrop.
  // The scrims over the backdrop
  // are tuned per answer (styles.css), so they need this one, not the tier.
  return (
    <div
      className="app"
      data-tier={tier}
      data-backdrop={showFallback ? 'flat' : 'scene'}
      data-motion={calm ? 'reduced' : 'full'}
      id="top"
    >
      <div className="canvas-wrap">
        {showFallback ? (
          <Fallback section={section} />
        ) : (
          <Suspense fallback={null}>
            <Scene tier={tier} portrait={portrait} />
          </Suspense>
        )}
      </div>

      <HUD />
      <div className="grain" aria-hidden />
    </div>
  );
}
