import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The top-level package a module comes from, so a copy nested under another
// one stays with its owner: react-dom carries its own scheduler, and r3f its
// own zustand 3.
const packageOf = (id) => id.match(/[\\/]node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/)?.[1].replace('\\', '/');

// The 3D's libraries, a chunk each, so they download side by side and a
// change to the scene's own code doesn't re-download three.js.
function sceneChunk(pkg) {
  if (pkg === 'three') return 'three';
  if (pkg === '@react-three/fiber' || pkg === '@react-three/drei') return 'r3f';
  // postprocessing is only needed for the glow passes
  if (pkg === 'postprocessing' || pkg === '@react-three/postprocessing') return 'postfx';
  return undefined;
}

// The project shipped without a config, so JSX was falling back to esbuild's
// classic transform (every file needed `import React`). Wiring up the React
// plugin gives us the automatic JSX runtime + Fast Refresh.
export default defineConfig({
  plugins: [react()],
  server: { host: true },
  build: {
    // GitHub Pages serves this repo from docs/ on the master branch, so build
    // straight into it. emptyOutDir keeps stale hashed assets from piling up.
    outDir: 'docs',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // A manual chunk swallows every dependency no other chunk claims, so
        // r3f used to take React, zustand (drei shares the store's copy) and
        // Vite's preload helper along with it. The entry then imported all
        // three from r3f, which imports three.js, and every visitor paid for
        // the whole 3D stack (~300 kB gz) before the HUD could mount. That
        // included the flat tier, which never draws it. Claiming the shared
        // modules for `vendor` keeps the 3D chunks behind the lazy <Scene>
        // import in App.jsx.
        manualChunks(id) {
          if (id.includes('vite/preload-helper')) return 'vendor';
          const pkg = packageOf(id);
          if (['react', 'react-dom', 'zustand'].includes(pkg)) return 'vendor';
          return sceneChunk(pkg);
        },
      },
    },
  },
  // The scene's worker (src/scene/worker.js, started by WorkerScene.jsx) is a
  // build of its own: a worker can't share the page's chunks, so it carries
  // its own three.js and the rest, which the page then never loads (the
  // page's copy is for browsers whose workers can't draw). Split the same
  // way, under a w- prefix, so the two sets can be told apart
  // (scripts/size-budget.mjs, and the prerender's preload).
  worker: {
    format: 'es',
    plugins: () => [react()],
    rollupOptions: {
      output: {
        entryFileNames: 'assets/w-scene-[hash].js',
        chunkFileNames: 'assets/w-[name]-[hash].js',
        manualChunks: (id) => sceneChunk(packageOf(id)),
      },
    },
  },
});
