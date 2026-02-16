import { render, screen } from '@testing-library/react';
import { FormatBadge } from '@/components/FormatBadge';

describe('FormatBadge', () => {
  it('renders "Text Post" label for text format', () => {
    render(<FormatBadge format="text" />);
    expect(screen.getByText('Text Post')).toBeInTheDocument();
  });

  it('renders "Carousel" label for carousel format', () => {
    render(<FormatBadge format="carousel" />);
    expect(screen.getByText('Carousel')).toBeInTheDocument();
  });

  it('renders "Infographic" label for infographic format', () => {
    render(<FormatBadge format="infographic" />);
    expect(screen.getByText('Infographic')).toBeInTheDocument();
  });

  it('renders "Video Script" label for video-script format', () => {
    render(<FormatBadge format="video-script" />);
    expect(screen.getByText('Video Script')).toBeInTheDocument();
  });

  it('renders "Poll" label for poll format', () => {
    render(<FormatBadge format="poll" />);
    expect(screen.getByText('Poll')).toBeInTheDocument();
  });

  it('renders "Other" fallback label for unknown format "link"', () => {
    render(<FormatBadge format="link" />);
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('renders "Other" fallback label for unknown format "video"', () => {
    render(<FormatBadge format="video" />);
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('renders an SVG icon alongside the label', () => {
    const { container } = render(<FormatBadge format="text" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('wraps content in a span with badge styling', () => {
    render(<FormatBadge format="carousel" />);
    const badge = screen.getByText('Carousel').closest('span');
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-full');
  });
});
