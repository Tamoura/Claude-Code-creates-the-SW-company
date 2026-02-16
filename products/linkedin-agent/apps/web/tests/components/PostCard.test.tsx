import { render, screen } from '@testing-library/react';
import { PostCard } from '@/components/PostCard';

// Mock next/link to render a plain anchor so we can test href
jest.mock('next/link', () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>;
  };
});

const baseProps = {
  id: 'post-123',
  title: 'Test Post Title',
  content: 'This is the main content of the post that should be displayed as a preview.',
  contentAr: null,
  contentEn: 'This is the English content of the post.',
  status: 'draft',
  format: 'text',
  createdAt: '2025-06-15T10:00:00Z',
};

describe('PostCard', () => {
  it('renders the post title', () => {
    render(<PostCard {...baseProps} />);
    expect(screen.getByText('Test Post Title')).toBeInTheDocument();
  });

  it('renders preview text from contentEn (first 150 chars)', () => {
    const longContent = 'A'.repeat(200);
    render(<PostCard {...baseProps} contentEn={longContent} />);
    // The preview should be the first 150 characters
    expect(screen.getByText('A'.repeat(150))).toBeInTheDocument();
  });

  it('falls back to content field when contentEn is null', () => {
    render(<PostCard {...baseProps} contentEn={null} />);
    expect(screen.getByText(baseProps.content)).toBeInTheDocument();
  });

  it('renders "English" language label when only contentEn is present', () => {
    render(<PostCard {...baseProps} contentAr={null} contentEn="English text" />);
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('renders Arabic language label when only contentAr is present', () => {
    render(<PostCard {...baseProps} contentAr="محتوى عربي" contentEn={null} />);
    expect(screen.getByText('العربية')).toBeInTheDocument();
  });

  it('renders "AR / EN" label when both languages are present', () => {
    render(<PostCard {...baseProps} contentAr="محتوى عربي" contentEn="English text" />);
    expect(screen.getByText('AR / EN')).toBeInTheDocument();
  });

  it('links to the correct post detail URL', () => {
    render(<PostCard {...baseProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/posts/post-123');
  });

  it('renders StatusBadge with correct status label', () => {
    render(<PostCard {...baseProps} status="published" />);
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('renders FormatBadge with correct format label', () => {
    render(<PostCard {...baseProps} format="carousel" />);
    expect(screen.getByText('Carousel')).toBeInTheDocument();
  });

  it('renders the formatted date', () => {
    render(<PostCard {...baseProps} createdAt="2025-06-15T10:00:00Z" />);
    expect(screen.getByText('Jun 15, 2025')).toBeInTheDocument();
  });
});
