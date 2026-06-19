import { defineConfig } from 'vitest/config';
import configShared from '../../vitest.shared';

export default defineConfig({
  ...configShared,
  root: import.meta.dirname,
  test: {
    ...configShared.test,
    include: ['test/**/*.test.ts'],
    environment: 'node',
    name: 'localnet',
  },
});
