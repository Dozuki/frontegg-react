import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'odcj7u',
  viewportWidth: 1440,
  viewportHeight: 800,
  video: true,
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    // Specs import each package's `src`, but reach core through the workspace
    // symlink to its `dist` -- so `make build` has to run before the suite.
    specPattern: 'packages/*/src/tests/**/*.cy-spec.{ts,tsx}',
    supportFile: false,
    indexHtmlFile: 'cypress/support/component-index.html',
  },
});
