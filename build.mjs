import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/worker.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir: 'dist',
  outExtension: { '.js': '.mjs' },
  sourcemap: true,
  external: ['@paperclipai/plugin-sdk', '@paperclipai/plugin-sdk/*'],
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
});

await esbuild.build({
  entryPoints: { 'plugin-manifest': 'src/manifest.ts' },
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir: 'dist',
  outExtension: { '.js': '.mjs' },
  sourcemap: true,
});

await esbuild.build({
  entryPoints: ['src/ui/index.tsx'],
  bundle: true,
  platform: 'browser',
  target: 'es2022',
  format: 'esm',
  outdir: 'dist/ui',
  sourcemap: true,
  external: ['react', 'react/jsx-runtime', '@paperclipai/plugin-sdk/ui'],
  jsx: 'automatic',
});

console.log('Build complete.');
