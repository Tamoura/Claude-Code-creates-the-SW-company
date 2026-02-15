import { render, screen } from '@testing-library/react';
import { TrendCard } from '@/components/TrendCard';

// Mock next/link to render a plain anchor so we can test href
jest.mock('next/link', () => {
  return function MockLink({ href, children, ...rest }: { href: string; children: React.ReactNode }) {
    return <a href={href} {...rest}>{children}</a>;
  };
});

const baseProps = {
  topic: 'AI in Recruitment',
  description: 'How AI is transforming talent acquisition and candidate experience.',
  relevanceScore: 85,
  suggestedAngles: [
    'Personal experience using AI tools',
    'Ethical considerations',
  ],
  category: 'Technology',
};

describe('TrendCard', () => {
  it('renders the topic heading', () => {
    render(<TrendCard {...baseProps} />);
    expect(screen.getByText('AI in Recruitment')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<TrendCard {...baseProps} />);
    expect(screen.getByText('How AI is transforming talent acquisition and candidate experience.')).toBeInTheDocument();
  });

  it('renders the relevance score with percentage', () => {
    render(<TrendCard {...baseProps} />);
    expect(screen.getByText('85% relevant')).toBeInTheDocument();
  });

  it('renders the category badge', () => {
    render(<TrendCard {...baseProps} />);
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });

  it('renders all suggested angles', () => {
    render(<TrendCard {...baseProps} />);
    expect(screen.getByText('Personal experience using AI tools')).toBeInTheDocument();
    expect(screen.getByText('Ethical considerations')).toBeInTheDocument();
  });

  it('renders "Suggested Angles" heading when angles exist', () => {
    render(<TrendCard {...baseProps} />);
    expect(screen.getByText('Suggested Angles')).toBeInTheDocument();
  });

  it('does not render "Suggested Angles" heading when no angles exist', () => {
    render(<TrendCard {...baseProps} suggestedAngles={[]} />);
    expect(screen.queryByText('Suggested Angles')).not.toBeInTheDocument();
  });

  it('links to /posts/new with encoded topic param', () => {
    render(<TrendCard {...baseProps} />);
    const link = screen.getByRole('link', { name: /generate post/i });
    expect(link).toHaveAttribute('href', '/posts/new?topic=AI%20in%20Recruitment');
  });

  it('renders the "Generate Post" button text', () => {
    render(<TrendCard {...baseProps} />);
    expect(screen.getByText('Generate Post')).toBeInTheDocument();
  });

  it('applies green color class for high relevance score (>= 80)', () => {
    render(<TrendCard {...baseProps} relevanceScore={90} />);
    const scoreEl = screen.getByText('90% relevant');
    expect(scoreEl).toHaveClass('text-green-400');
  });

  it('applies yellow color class for medium relevance score (60-79)', () => {
    render(<TrendCard {...baseProps} relevanceScore={65} />);
    const scoreEl = screen.getByText('65% relevant');
    expect(scoreEl).toHaveClass('text-yellow-400');
  });

  it('applies gray color class for low relevance score (< 60)', () => {
    render(<TrendCard {...baseProps} relevanceScore={40} />);
    const scoreEl = screen.getByText('40% relevant');
    expect(scoreEl).toHaveClass('text-gray-400');
  });
});
