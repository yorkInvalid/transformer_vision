import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Vite configuration
// base is configurable so the app can be deployed under a sub-path (e.g. GitHub Pages)
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [svelte()],
  server: {
    port: 5173,
    strictPort: true
  }
});


