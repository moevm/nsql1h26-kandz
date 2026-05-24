import { fileURLToPath } from 'node:url';
import type { AliasOptions } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const isTest = Boolean(process.env.VITEST) || process.argv.some((arg) => arg.includes('vitest'));
  const motionMockPath = fileURLToPath(new URL('./src/test/mocks/motion-react.ts', import.meta.url));
  const alias: AliasOptions = isTest ? { 'motion/react': motionMockPath } : {};

  return {
    plugins: [react()],
    resolve: {
      alias,
    },
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:8000',
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: '/src/test/setup.ts',
    },
  };
});
