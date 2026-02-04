import { describe, it, expect } from 'vitest';
import { createProjectZip } from '../../src/lib/zip-export';
import type { ParsedFile } from '../../src/lib/artifact-parser';
import JSZip from 'jszip';

describe('createProjectZip', () => {
  it('should create a zip blob from parsed files', async () => {
    const files: ParsedFile[] = [
      { path: 'src/App.tsx', content: 'export function App() {}' },
      { path: 'package.json', content: '{"name":"test"}' },
    ];

    const blob = await createProjectZip(files);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('should contain all files in the zip', async () => {
    const files: ParsedFile[] = [
      { path: 'src/index.ts', content: 'console.log("hi")' },
      { path: 'src/util.ts', content: 'export const x = 1' },
      { path: 'README.md', content: '# Test' },
    ];

    const blob = await createProjectZip(files);
    const zip = await JSZip.loadAsync(blob);

    expect(Object.keys(zip.files)).toContain('src/index.ts');
    expect(Object.keys(zip.files)).toContain('src/util.ts');
    expect(Object.keys(zip.files)).toContain('README.md');
  });

  it('should preserve file content', async () => {
    const files: ParsedFile[] = [
      { path: 'test.txt', content: 'Hello World' },
    ];

    const blob = await createProjectZip(files);
    const zip = await JSZip.loadAsync(blob);
    const content = await zip.file('test.txt')!.async('string');

    expect(content).toBe('Hello World');
  });

  it('should handle empty file list', async () => {
    const blob = await createProjectZip([]);

    expect(blob).toBeInstanceOf(Blob);
  });
});
