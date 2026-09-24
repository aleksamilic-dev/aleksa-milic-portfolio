import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
          // The top-level package, so a copy nested under another one stays
          // with its owner: react-dom carries its own scheduler, and r3f its
          // own zustand 3.
          const pkg = id.match(/[\\/]node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/)?.[1].replace('\\', '/');
          if (pkg === 'three') return 'three';
          if (pkg === '@react-three/fiber' || pkg === '@react-three/drei') return 'r3f';
          // postprocessing is only needed for the bloom/vignette pass — keep it
          // in its own chunk so it downloads in parallel with the rest.
          if (pkg === 'postprocessing' || pkg === '@react-three/postprocessing') return 'postfx';
          if (['react', 'react-dom', 'zustand'].includes(pkg)) return 'vendor';
        },
      },
    },
  },
});
