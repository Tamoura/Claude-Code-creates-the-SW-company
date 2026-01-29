import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Citation from './Citation';

describe('Citation', () => {
  it('renders single citation', () => {
    render(
      <BrowserRouter>
        <Citation refId={1} />
      </BrowserRouter>
    );

    const citation = screen.getByText('[', { exact: false });
    expect(citation).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders multiple citations', () => {
    render(
      <BrowserRouter>
        <Citation refId={[1, 2, 3]} />
      </BrowserRouter>
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('creates links with correct href', () => {
    render(
      <BrowserRouter>
        <Citation refId={1} />
      </BrowserRouter>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '#ref-1');
  });

  it('separates multiple citations with commas', () => {
    const { container } = render(
      <BrowserRouter>
        <Citation refId={[1, 2]} />
      </BrowserRouter>
    );

    const text = container.textContent;
    expect(text).toContain('1,2');
  });

  it('renders as superscript', () => {
    const { container } = render(
      <BrowserRouter>
        <Citation refId={1} />
      </BrowserRouter>
    );

    const sup = container.querySelector('sup');
    expect(sup).toBeInTheDocument();
  });
});
