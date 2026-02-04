import JSZip from 'jszip';
import type { ParsedFile } from './artifact-parser';

export async function createProjectZip(files: ParsedFile[]): Promise<Blob> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  return zip.generateAsync({ type: 'blob' });
}
