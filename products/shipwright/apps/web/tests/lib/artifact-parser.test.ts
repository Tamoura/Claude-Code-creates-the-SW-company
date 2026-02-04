import { describe, it, expect } from 'vitest';
import { parseArtifacts, type ParsedFile } from '../../src/lib/artifact-parser';

describe('parseArtifacts', () => {
  it('should extract files from boltArtifact XML', () => {
    const text = `Here is the code:
<boltArtifact id="todo-app" title="Todo App">
  <boltAction type="file" filePath="src/App.tsx">
export function App() {
  return <div>Hello</div>;
}
  </boltAction>
</boltArtifact>`;

    const files = parseArtifacts(text);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('src/App.tsx');
    expect(files[0].content).toContain('export function App()');
  });

  it('should extract multiple files from one artifact', () => {
    const text = `<boltArtifact id="app" title="App">
  <boltAction type="file" filePath="src/index.ts">
console.log("hello");
  </boltAction>
  <boltAction type="file" filePath="src/util.ts">
export const add = (a: number, b: number) => a + b;
  </boltAction>
</boltArtifact>`;

    const files = parseArtifacts(text);

    expect(files).toHaveLength(2);
    expect(files[0].path).toBe('src/index.ts');
    expect(files[1].path).toBe('src/util.ts');
  });

  it('should handle multiple artifacts', () => {
    const text = `<boltArtifact id="a1" title="First">
  <boltAction type="file" filePath="a.ts">a</boltAction>
</boltArtifact>
<boltArtifact id="a2" title="Second">
  <boltAction type="file" filePath="b.ts">b</boltAction>
</boltArtifact>`;

    const files = parseArtifacts(text);

    expect(files).toHaveLength(2);
  });

  it('should override earlier files with later ones at the same path', () => {
    const text = `<boltArtifact id="a1" title="First">
  <boltAction type="file" filePath="src/App.tsx">version1</boltAction>
</boltArtifact>
<boltArtifact id="a2" title="Second">
  <boltAction type="file" filePath="src/App.tsx">version2</boltAction>
</boltArtifact>`;

    const files = parseArtifacts(text);

    expect(files).toHaveLength(1);
    expect(files[0].content).toContain('version2');
  });

  it('should skip non-file actions', () => {
    const text = `<boltArtifact id="app" title="App">
  <boltAction type="shell">npm install</boltAction>
  <boltAction type="file" filePath="src/App.tsx">code</boltAction>
  <boltAction type="start">npm run dev</boltAction>
</boltArtifact>`;

    const files = parseArtifacts(text);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('src/App.tsx');
  });

  it('should return empty array for text without artifacts', () => {
    const files = parseArtifacts('Just some regular text without any code.');

    expect(files).toHaveLength(0);
  });
});
