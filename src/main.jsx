import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// `npm run build` prerenders the HUD into docs/index.html (scripts/prerender.mjs)
// so crawlers and slow connections get the real text in the initial response.
// React then mounts over it — the markup is identical, so the swap is invisible;
// we don't hydrate because the app's Suspense/lazy 3D boundary can't be
// reconstructed from a DOM snapshot.
createRoot(document.getElementById('root')).render(<App />);
