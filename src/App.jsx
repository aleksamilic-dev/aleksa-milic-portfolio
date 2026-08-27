import { lazy, Suspense } from 'react';
import { useFactory } from './store.js';
import { useDeviceTier } from './hooks.js';
import HUD from './ui/HUD.jsx';
import Fallback from './ui/Fallback.jsx';

// three + drei + postprocessing are heavy; keep them out of the initial
// bundle so the HUD paints immediately. The 3D is ambient backdrop only —
// the page is fully readable before (and without) it.
const Scene = lazy(() => import('./scene/Scene.jsx'));

export default function App() {
  const tier = useDeviceTier();
  const calm = useFactory((s) => s.calmMode);
  const section = useFactory((s) => s.section);

  return (
    <div className="app" data-tier={tier} data-calm={calm || undefined} id="top">
      <div className="canvas-wrap">
        {tier === 'flat' ? (
          <Fallback section={section} />
        ) : (
          <Suspense fallback={null}>
            <Scene tier={tier} />
          </Suspense>
        )}
      </div>

      <HUD />
      <div className="grain" aria-hidden />
    </div>
  );
}
