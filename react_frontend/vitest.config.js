import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{js,jsx}', 'src/**/*.test.{js,jsx}'],
    setupFiles: ['./test/setup.js', './src/test/setup.js'],
    css: false,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(root, './src'),
    },
  },
});
