import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Only the component-test dev server uses vite; packages still ship via rollup.
export default defineConfig({
  plugins: [react()],
  // `make build` rewrites the package dists the specs import, which leaves vite's
  // pre-bundled deps stale; re-optimizing on every start avoids the mid-run reload
  // that otherwise aborts the spec's dynamic import.
  optimizeDeps: {
    force: true,
  },
  resolve: {
    // Packages reach each other through workspace symlinks, so react and the
    // router have to resolve to one copy or contexts stop matching.
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
});
