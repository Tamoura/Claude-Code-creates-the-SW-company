import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { repoPath } from './repo.service.js';

export interface SharedPackage {
  name: string;
  location: string;
  description: string;
  fileCount: number;
  hasBackend: boolean;
  hasFrontend: boolean;
  hasPrisma: boolean;
}

export interface ComponentRegistryStats {
  totalPackages: number;
  totalComponents: number;
  packages: SharedPackage[];
}

/** List all shared packages in packages/ */
export function listPackages(): SharedPackage[] {
  const packagesDir = repoPath('packages');
  if (!existsSync(packagesDir)) return [];

  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => buildPackageInfo(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Get component registry stats */
export function getComponentStats(): ComponentRegistryStats {
  const packages = listPackages();
  return {
    totalPackages: packages.length,
    totalComponents: packages.reduce((sum, p) => sum + p.fileCount, 0),
    packages,
  };
}

function buildPackageInfo(name: string): SharedPackage {
  const dir = repoPath('packages', name);
  let description = `@connectsw/${name}`;

  // Read package.json for description
  const pkgPath = join(dir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.description) description = pkg.description;
    } catch { /* ignore */ }
  }

  const hasBackend = existsSync(join(dir, 'src', 'backend')) || existsSync(join(dir, 'src', 'plugins'));
  const hasFrontend = existsSync(join(dir, 'src', 'frontend')) || existsSync(join(dir, 'src', 'components'));
  const hasPrisma = existsSync(join(dir, 'src', 'prisma'));

  return {
    name: `@connectsw/${name}`,
    location: `packages/${name}/`,
    description,
    fileCount: countFiles(dir),
    hasBackend,
    hasFrontend,
    hasPrisma,
  };
}

function countFiles(dir: string): number {
  let count = 0;
  try {
    const walk = (d: string) => {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        const full = join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else count++;
      }
    };
    walk(dir);
  } catch { /* ignore */ }
  return count;
}
