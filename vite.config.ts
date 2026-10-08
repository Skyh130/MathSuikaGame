import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { pwaOptions } from './pwa.config';

export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  plugins: [VitePWA(pwaOptions)],
  test: { include: ['tests/**/*.test.ts'] },
});
