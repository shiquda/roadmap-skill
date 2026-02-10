import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(fileURLToPath(import.meta.url), '..');

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/web/app'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist/web/app'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/web/app/index.html'),
      },
    },
  },
});
