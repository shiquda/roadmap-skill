import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'es2022',
    platform: 'node',
    outDir: 'dist',
    clean: true,
    dts: true,
    sourcemap: true,
    splitting: false,
    bundle: true,
    minify: false,
    shims: true
  },
  {
    entry: ['src/web/server.ts'],
    format: ['esm'],
    target: 'es2022',
    platform: 'node',
    outDir: 'dist/web',
    clean: false,
    dts: false,
    sourcemap: true,
    splitting: false,
    bundle: true,
    minify: false,
    shims: true,
    external: ['express']
  }
]);
