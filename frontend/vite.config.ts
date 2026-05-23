/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const isTest = Boolean(process.env.VITEST) || process.argv.some((arg) => arg.includes('vitest'));
  const motionMockPath = fileURLToPath(new URL('./src/test/mocks/motion-react.ts', import.meta.url));

  return {
  plugins: [react()],
  resolve: {
      alias: isTest ? { 'motion/react': motionMockPath } : {},
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
