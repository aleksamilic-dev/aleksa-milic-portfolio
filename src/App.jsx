import { lazy, Suspense } from 'react';
import { useFactory } from './store.js';
import { useDeviceTier, useMediaQuery } from './hooks.js';
import HUD from './ui/HUD.jsx';
import Fallback from './ui/Fallback.jsx';

// three + drei + postprocessing are heavy; keep them out of the initial
// bundle so the HUD paints immediately. The 3D is ambient backdrop only —
// the page is fully readable before (and without) it.
const Scene = lazy(() => import('./scene/Scene.jsx'));
// Phones get a purpose-built portrait scene instead of the scrolling corridor.
const HeroScene = lazy(() => import('./scene/HeroScene.jsx'));

// Dev-only: ?inspect=<0-4> swaps the whole app for a single machine on a lit
// turntable (see scene/Inspector.jsx). Not reachable from the shipped UI.
const Inspector = lazy(() => import('./scene/Inspector.jsx'));
const INSPECT =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('inspect')
    : null;

export default function App() {
  const tier = useDeviceTier();
  const mobile = useMediaQuery('(max-width: 720px)');
  const section = useFactory((s) => s.section);
  const heroInView = useFactory((s) => s.heroInView);

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

  // On phones the 3D is a hero-only moment — fade the canvas out once the hero
  // has scrolled away (its render loop freezes in step; see HeroScene).
  const heroOut = mobile && tier !== 'flat' && !heroInView;

  return (
    <div className="app" data-tier={tier} data-hero-out={heroOut || undefined} id="top">
      <div className="canvas-wrap">
        {tier === 'flat' ? (
          <Fallback section={section} />
        ) : (
          <Suspense fallback={null}>
            {mobile ? <HeroScene heroInView={heroInView} /> : <Scene tier={tier} />}
          </Suspense>
        )}
      </div>

      <HUD />
      <div className="grain" aria-hidden />
    </div>
  );
}
