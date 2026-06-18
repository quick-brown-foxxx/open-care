import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import configShared from '../../vitest.shared';

export default defineConfig({
  ...configShared,
  plugins: [sveltekit()],
  resolve: {
    conditions: ['browser'],
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
  },
});
