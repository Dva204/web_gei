import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/helpers/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // Windows sandbox temp directories may be reclaimed while Vitest workers
    // are still importing transformed modules. Keep the cache in the workspace.
    fsModuleCache: true,
    fsModuleCachePath: '.data/vitest-cache',
  },
});
