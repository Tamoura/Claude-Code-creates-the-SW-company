import { build } from 'esbuild';
import { execSync } from 'child_process';
import { rmSync, mkdirSync } from 'fs';

// Clean dist directory
try {
  rmSync('./dist', { recursive: true, force: true });
} catch {}
mkdirSync('./dist', { recursive: true });

// Build CommonJS
await build({
  entryPoints: ['./src/index.ts'],
  outfile: './dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  sourcemap: true,
  minify: false,
});

// Build ESM
await build({
  entryPoints: ['./src/index.ts'],
  outfile: './dist/index.mjs',
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  sourcemap: true,
  minify: false,
});

// Generate type declarations
console.log('Generating type declarations...');
execSync('npx tsc --emitDeclarationOnly --declaration --declarationDir ./dist', {
  stdio: 'inherit',
});

console.log('Build complete!');
