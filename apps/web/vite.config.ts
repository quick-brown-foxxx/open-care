import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  define: {
    'import.meta.env.DEPLOY_VERSION': JSON.stringify(process.env.DEPLOY_VERSION ?? '0.1.0-dev'),
  },
});
