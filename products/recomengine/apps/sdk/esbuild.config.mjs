import { build } from 'esbuild';

build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'RecomEngineSDK',
  outfile: 'dist/recomengine.v1.js',
  target: ['chrome80', 'firefox78', 'safari13', 'edge80'],
  sourcemap: true,
}).then(() => {
  console.log('SDK built successfully');
}).catch((err) => {
  console.error('SDK build failed:', err);
  process.exit(1);
});
