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
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing', 'postprocessing'],
        },
      },
    },
  },
});
