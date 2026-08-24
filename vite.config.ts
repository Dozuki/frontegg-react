import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Only the component-test dev server uses vite; packages still ship via rollup.
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Cypress points vite's dep scanner at the spec files, but most of what the specs
    // pull in arrives through @frontegg/react-core, a symlinked workspace package the
    // scanner won't walk into. Left to be discovered at request time, vite reloads the
    // page mid-run ("optimized dependencies changed") and aborts the spec's own dynamic
    // import, failing whichever test ran first. Listing them pre-bundles them at start.
    include: [
      '@frontegg/react-hooks',
      '@frontegg/react-hooks/auth',
      '@frontegg/redux-store',
      '@frontegg/redux-store/',
      '@frontegg/redux-store/audits/backward-compatibility',
      '@frontegg/redux-store/auth',
      '@frontegg/redux-store/connectivity',
      '@frontegg/redux-store/toolkit',
      '@frontegg/rest-api',
      '@reduxjs/toolkit',
      'classnames',
      'clipboard-copy',
      'formik',
      'google-map-react',
      'history',
      'i18next',
      'jwt-encode',
      'moment',
      'owasp-password-strength-test',
      'rc-dialog',
      'react-datepicker',
      'react-dropzone',
      'react-i18next',
      'react-is',
      'react-popper-tooltip',
      'react-recaptcha-v3',
      'react-router-dom',
      'react-select',
      'react-table',
      'react-waypoint',
      'tslib',
      'ua-parser-js',
      'uuid',
      'yup',
    ],
  },
  resolve: {
    // Packages reach each other through workspace symlinks, so react and the
    // router have to resolve to one copy or contexts stop matching.
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
});
