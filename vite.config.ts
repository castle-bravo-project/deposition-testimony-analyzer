import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig({
  base: '/deposition-testimony-analyzer/', // for GitHub Pages
  define: {
    'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
