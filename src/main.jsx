import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// `npm run build` prerenders the HUD into docs/index.html (scripts/prerender.mjs)
// so crawlers and slow connections get the real text in the initial response.
// React then mounts over it — the markup is identical, so the swap is invisible;
// we don't hydrate because the app's Suspense/lazy 3D boundary can't be
// reconstructed from a DOM snapshot.
//
// The markup matches, but the nodes are new, and new nodes replay their
// entrance: the shell's fade-in and every on-screen [data-reveal]. On a slow
// phone the copy the visitor is already reading would blink out and back, and
// that late repaint is what Google then measures as LCP. `data-swap` tells
// styles.css and HUD's first reveal pass to skip the entrance this once. Only
// if the static page has actually painted, though: when this runs first, the
// entrance hasn't been seen yet and React's tree should play it.
const container = document.getElementById('root');
if (container.firstElementChild && performance.getEntriesByName('first-contentful-paint').length) {
  document.documentElement.setAttribute('data-swap', '');
}
createRoot(container).render(<App />);
