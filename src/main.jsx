import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './fonts.css';
import './styles.css';

// `npm run build` prerenders the HUD into docs/index.html (scripts/prerender.mjs)
// so crawlers and slow connections get the real text in the initial response.
// React then mounts over it — the markup is identical, so the swap is invisible;
// we don't hydrate because the app's Suspense/lazy 3D boundary can't be
// reconstructed from a DOM snapshot.
//
// The static page is the one the visitor reads first, so it gets painted
// before React starts: the mount waits for a frame to go by. That's a sure
// sign the page is on screen, where the first-paint timing entry this used
// to check isn't always recorded (a page opened in the background, a headless
// browser), and whenever it was missing, React's swap replayed the entrance
// over copy the visitor was already reading: the page blinked out and back.
//
// The markup matches, but the nodes are new, and new nodes replay their
// entrance: the shell's fade-in and every on-screen [data-reveal]. `data-swap`
// tells styles.css and HUD's first reveal pass to skip it this once. With no
// static page (the prerender's own run, or `npm run dev`), React mounts at
// once and plays the entrance.
const container = document.getElementById('root');
const mount = () => createRoot(container).render(<App />);

if (container.firstElementChild) {
  // a frame callback runs just before the paint, and a task queued from it
  // just after
  requestAnimationFrame(() =>
    setTimeout(() => {
      document.documentElement.setAttribute('data-swap', '');
      mount();
    }, 0),
  );
} else {
  mount();
}
