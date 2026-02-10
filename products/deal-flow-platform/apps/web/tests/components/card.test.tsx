import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

describe('Card', () => {
  it('renders Card with children', () => {
    render(<Card data-testid="card">Content</Card>);
    expect(screen.getByTestId('card')).toHaveTextContent('Content');
  });

  it('applies border and shadow styling', () => {
    render(<Card data-testid="card">Styled</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('border');
    expect(card.className).toContain('shadow-sm');
    expect(card.className).toContain('rounded-lg');
  });

  it('merges custom className on Card', () => {
    render(<Card data-testid="card" className="my-custom">Custom</Card>);
    expect(screen.getByTestId('card').className).toContain('my-custom');
  });
});

describe('CardHeader', () => {
  it('renders with padding', () => {
    render(<CardHeader data-testid="header">Header</CardHeader>);
    const header = screen.getByTestId('header');
    expect(header.className).toContain('p-6');
    expect(header).toHaveTextContent('Header');
  });
});

describe('CardTitle', () => {
  it('renders as h3 element', () => {
    render(<CardTitle>My Title</CardTitle>);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('My Title');
  });

  it('applies font-semibold styling', () => {
    render(<CardTitle>Styled Title</CardTitle>);
    const title = screen.getByRole('heading');
    expect(title.className).toContain('font-semibold');
  });
});

describe('CardDescription', () => {
  it('renders description text', () => {
    render(<CardDescription>Some description</CardDescription>);
    expect(screen.getByText('Some description')).toBeInTheDocument();
  });

  it('applies muted text color', () => {
    render(<CardDescription data-testid="desc">Desc</CardDescription>);
    expect(screen.getByTestId('desc').className).toContain('text-gray-600');
  });
});

describe('CardContent', () => {
  it('renders content with correct padding', () => {
    render(<CardContent data-testid="content">Body</CardContent>);
    const content = screen.getByTestId('content');
    expect(content.className).toContain('p-6');
    expect(content.className).toContain('pt-0');
    expect(content).toHaveTextContent('Body');
  });
});

describe('CardFooter', () => {
  it('renders footer with flex layout', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer.className).toContain('flex');
    expect(footer).toHaveTextContent('Footer');
  });
});

describe('Card composition', () => {
  it('renders a full card with all parts', () => {
    render(
      <Card data-testid="full-card">
        <CardHeader>
          <CardTitle>Deal Title</CardTitle>
          <CardDescription>Deal description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Target: QR 10,000,000</p>
        </CardContent>
        <CardFooter>
          <button>Subscribe</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByTestId('full-card')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Deal Title' })).toBeInTheDocument();
    expect(screen.getByText('Deal description')).toBeInTheDocument();
    expect(screen.getByText('Target: QR 10,000,000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument();
  });
});
