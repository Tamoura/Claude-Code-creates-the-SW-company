import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileViewer } from '../../src/components/FileViewer/FileViewer';
import { FileTree } from '../../src/components/FileViewer/FileTree';
import { CodeBlock } from '../../src/components/FileViewer/CodeBlock';

describe('CodeBlock', () => {
  it('should render code content', () => {
    render(<CodeBlock code="const x = 1;" filename="test.ts" />);

    expect(screen.getByText(/const x = 1/)).toBeInTheDocument();
  });

  it('should show the filename', () => {
    render(<CodeBlock code="hello" filename="src/App.tsx" />);

    expect(screen.getByText('src/App.tsx')).toBeInTheDocument();
  });
});

describe('FileTree', () => {
  const paths = ['src/App.tsx', 'src/index.ts', 'package.json'];

  it('should render all file paths', () => {
    render(<FileTree paths={paths} selectedPath={null} onSelect={vi.fn()} />);

    expect(screen.getByText('src/App.tsx')).toBeInTheDocument();
    expect(screen.getByText('src/index.ts')).toBeInTheDocument();
    expect(screen.getByText('package.json')).toBeInTheDocument();
  });

  it('should call onSelect when a file is clicked', () => {
    const onSelect = vi.fn();
    render(<FileTree paths={paths} selectedPath={null} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('src/App.tsx'));

    expect(onSelect).toHaveBeenCalledWith('src/App.tsx');
  });

  it('should highlight selected file', () => {
    render(<FileTree paths={paths} selectedPath="src/App.tsx" onSelect={vi.fn()} />);

    const item = screen.getByText('src/App.tsx').closest('button');
    expect(item).toHaveClass('bg-gray-700');
  });
});

describe('FileViewer', () => {
  it('should show empty state when no files', () => {
    render(<FileViewer files={new Map()} />);

    expect(screen.getByText(/no files/i)).toBeInTheDocument();
  });

  it('should show file tree and code when files are provided', () => {
    const files = new Map([
      ['src/App.tsx', 'export function App() {}'],
      ['package.json', '{"name":"test"}'],
    ]);

    render(<FileViewer files={files} />);

    expect(screen.getByText('src/App.tsx')).toBeInTheDocument();
    expect(screen.getByText('package.json')).toBeInTheDocument();
  });

  it('should display selected file content', () => {
    const files = new Map([
      ['src/App.tsx', 'export function App() { return <div>Hello</div>; }'],
    ]);

    render(<FileViewer files={files} />);

    // Click the file to select it
    fireEvent.click(screen.getByText('src/App.tsx'));

    expect(screen.getByText(/export function App/)).toBeInTheDocument();
  });
});
