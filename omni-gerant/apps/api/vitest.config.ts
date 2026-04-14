import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/__tests__/**', 'src/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@omni-gerant/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
