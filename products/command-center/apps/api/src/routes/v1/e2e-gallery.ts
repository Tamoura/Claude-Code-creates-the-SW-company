import { FastifyInstance } from 'fastify';
import { readdir, stat } from 'fs/promises';
import { join, basename, extname } from 'path';
import { existsSync, createReadStream } from 'fs';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..', '..', '..', '..');

interface ScreenshotInfo {
  name: string;
  filename: string;
  product: string;
  category: string;
  url: string;
  sizeKb: number;
  modifiedAt: string;
}

interface VideoInfo {
  name: string;
  filename: string;
  product: string;
  testName: string;
  url: string;
  sizeKb: number;
  modifiedAt: string;
}

interface TraceInfo {
  name: string;
  filename: string;
  product: string;
  testName: string;
  url: string;
  sizeKb: number;
}

function categorizeScreenshot(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.startsWith('smoke')) return 'Smoke Tests';
  if (lower.startsWith('us-auth') || lower.includes('auth')) return 'Authentication';
  if (lower.startsWith('flow1')) return 'Registration & Login';
  if (lower.startsWith('flow2') || lower.includes('assessment')) return 'Assessment';
  if (lower.startsWith('flow3') || lower.includes('profile')) return 'Profile';
  if (lower.startsWith('flow4') || lower.includes('learning')) return 'Learning Paths';
  if (lower.startsWith('flow5') || lower.includes('dashboard')) return 'Dashboard';
  if (lower.startsWith('flow6') || lower.includes('admin')) return 'Admin';
  if (lower.startsWith('flow7') || lower.includes('tenant')) return 'Multi-Tenancy';
  if (lower.startsWith('flow8')) return 'Cross-Page Validation';
  if (lower.startsWith('us-')) return 'User Stories';
  return 'General';
}

function humanizeName(filename: string): string {
  return basename(filename, extname(filename))
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function scanScreenshots(product: string): Promise<ScreenshotInfo[]> {
  const screenshotsDir = join(REPO_ROOT, 'products', product, 'e2e', 'test-results', 'screenshots');
  if (!existsSync(screenshotsDir)) return [];

  const files = await readdir(screenshotsDir);
  const screenshots: ScreenshotInfo[] = [];

  for (const file of files) {
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extname(file).toLowerCase())) continue;
    const filePath = join(screenshotsDir, file);
    const stats = await stat(filePath);
    screenshots.push({
      name: humanizeName(file),
      filename: file,
      product,
      category: categorizeScreenshot(file),
      url: `/api/v1/e2e-gallery/file/${product}/screenshots/${file}`,
      sizeKb: Math.round(stats.size / 1024),
      modifiedAt: stats.mtime.toISOString(),
    });
  }

  return screenshots.sort((a, b) => a.filename.localeCompare(b.filename));
}

async function scanVideos(product: string): Promise<VideoInfo[]> {
  const testResultsDir = join(REPO_ROOT, 'products', product, 'e2e', 'test-results');
  if (!existsSync(testResultsDir)) return [];

  const entries = await readdir(testResultsDir);
  const videos: VideoInfo[] = [];

  for (const entry of entries) {
    const entryPath = join(testResultsDir, entry);
    const entryStat = await stat(entryPath);
    if (!entryStat.isDirectory()) continue;

    try {
      const subFiles = await readdir(entryPath);
      for (const file of subFiles) {
        if (!['.webm', '.mp4'].includes(extname(file).toLowerCase())) continue;
        const filePath = join(entryPath, file);
        const stats = await stat(filePath);
        videos.push({
          name: humanizeName(entry),
          filename: file,
          product,
          testName: entry,
          url: `/api/v1/e2e-gallery/file/${product}/videos/${entry}/${file}`,
          sizeKb: Math.round(stats.size / 1024),
          modifiedAt: stats.mtime.toISOString(),
        });
      }
    } catch {
      // Skip unreadable directories
    }
  }

  return videos.sort((a, b) => a.testName.localeCompare(b.testName));
}

async function scanTraces(product: string): Promise<TraceInfo[]> {
  const testResultsDir = join(REPO_ROOT, 'products', product, 'e2e', 'test-results');
  if (!existsSync(testResultsDir)) return [];

  const entries = await readdir(testResultsDir);
  const traces: TraceInfo[] = [];

  for (const entry of entries) {
    const entryPath = join(testResultsDir, entry);
    const entryStat = await stat(entryPath);
    if (!entryStat.isDirectory()) continue;

    try {
      const subFiles = await readdir(entryPath);
      for (const file of subFiles) {
        if (extname(file).toLowerCase() !== '.zip') continue;
        const filePath = join(entryPath, file);
        const stats = await stat(filePath);
        traces.push({
          name: humanizeName(entry),
          filename: file,
          product,
          testName: entry,
          url: `/api/v1/e2e-gallery/file/${product}/traces/${entry}/${file}`,
          sizeKb: Math.round(stats.size / 1024),
        });
      }
    } catch {
      // Skip
    }
  }

  return traces;
}

export async function e2eGalleryRoutes(app: FastifyInstance) {
  // List all E2E test artifacts
  app.get('/e2e-gallery', async () => {
    const productsDir = join(REPO_ROOT, 'products');
    if (!existsSync(productsDir)) return { products: [] };

    const productDirs = await readdir(productsDir);
    const products: Array<{
      name: string;
      screenshots: ScreenshotInfo[];
      videos: VideoInfo[];
      traces: TraceInfo[];
    }> = [];

    for (const product of productDirs) {
      const e2eDir = join(productsDir, product, 'e2e', 'test-results');
      if (!existsSync(e2eDir)) continue;

      const [screenshots, videos, traces] = await Promise.all([
        scanScreenshots(product),
        scanVideos(product),
        scanTraces(product),
      ]);

      if (screenshots.length > 0 || videos.length > 0 || traces.length > 0) {
        products.push({ name: product, screenshots, videos, traces });
      }
    }

    return { products };
  });

  // Serve individual files (screenshots, videos, traces)
  app.get('/e2e-gallery/file/:product/screenshots/:filename', async (request, reply) => {
    const { product, filename } = request.params as { product: string; filename: string };
    const filePath = join(REPO_ROOT, 'products', product, 'e2e', 'test-results', 'screenshots', filename);

    if (!existsSync(filePath)) {
      return reply.code(404).send({ error: 'File not found' });
    }

    const ext = extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    };

    return reply.type(mimeTypes[ext] || 'application/octet-stream').send(createReadStream(filePath));
  });

  app.get('/e2e-gallery/file/:product/videos/:testName/:filename', async (request, reply) => {
    const { product, testName, filename } = request.params as { product: string; testName: string; filename: string };
    const filePath = join(REPO_ROOT, 'products', product, 'e2e', 'test-results', testName, filename);

    if (!existsSync(filePath)) {
      return reply.code(404).send({ error: 'File not found' });
    }

    const ext = extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.webm': 'video/webm',
      '.mp4': 'video/mp4',
    };

    return reply.type(mimeTypes[ext] || 'application/octet-stream').send(createReadStream(filePath));
  });

  app.get('/e2e-gallery/file/:product/traces/:testName/:filename', async (request, reply) => {
    const { product, testName, filename } = request.params as { product: string; testName: string; filename: string };
    const filePath = join(REPO_ROOT, 'products', product, 'e2e', 'test-results', testName, filename);

    if (!existsSync(filePath)) {
      return reply.code(404).send({ error: 'File not found' });
    }

    return reply.type('application/zip').send(createReadStream(filePath));
  });
}
