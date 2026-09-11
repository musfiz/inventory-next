import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Mirror tsconfig paths ("@/*": ["./*"]) so tests can use "@/..." imports.
    // process.cwd() keeps this file loadable as CJS or ESM (no import.meta).
    alias: { '@': path.resolve(process.cwd()) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'out', 'build'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'hooks/**/*.ts'],
    },
  },
});
