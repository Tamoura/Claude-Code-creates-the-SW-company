import { build } from 'esbuild';
import { execSync } from 'child_process';

// Generate TypeScript declarations
execSync('npx tsc --emitDeclarationOnly', { stdio: 'inherit' });

// Build ESM
await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/index.js',
  platform: 'node',
  target: 'es2020',
  sourcemap: true,
});

// Build CJS
await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'cjs',
  outfile: 'dist/index.cjs',
  platform: 'node',
  target: 'es2020',
  sourcemap: true,
});

console.log('Build complete: ESM + CJS + declarations');
