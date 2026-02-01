import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../Card';

describe('Card', () => {
  it('renders Card with children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies base styling', () => {
    render(<Card data-testid="card">Test</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('rounded-lg');
    expect(card.className).toContain('border');
    expect(card.className).toContain('bg-white');
  });

  it('accepts custom className on Card', () => {
    render(<Card className="w-full" data-testid="card">Test</Card>);
    expect(screen.getByTestId('card').className).toContain('w-full');
  });
});

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('applies padding', () => {
    render(<CardHeader data-testid="hdr">Header</CardHeader>);
    expect(screen.getByTestId('hdr').className).toContain('p-6');
  });
});

describe('CardTitle', () => {
  it('renders as h3 element', () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('applies semibold styling', () => {
    render(<CardTitle>Title</CardTitle>);
    const heading = screen.getByRole('heading');
    expect(heading.className).toContain('font-semibold');
  });
});

describe('CardDescription', () => {
  it('renders paragraph text', () => {
    render(<CardDescription>Description text</CardDescription>);
    expect(screen.getByText('Description text')).toBeInTheDocument();
  });

  it('applies muted text color', () => {
    render(
      <CardDescription data-testid="desc">Desc</CardDescription>
    );
    expect(screen.getByTestId('desc').className).toContain('text-gray-500');
  });
});

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent>Body</CardContent>);
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});

describe('CardFooter', () => {
  it('renders children', () => {
    render(<CardFooter>Footer</CardFooter>);
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('uses flex layout', () => {
    render(<CardFooter data-testid="ft">Footer</CardFooter>);
    expect(screen.getByTestId('ft').className).toContain('flex');
  });
});

describe('Card composition', () => {
  it('renders a full card with all sub-components', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>My Title</CardTitle>
          <CardDescription>My Description</CardDescription>
        </CardHeader>
        <CardContent>Main content</CardContent>
        <CardFooter>Footer area</CardFooter>
      </Card>
    );

    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.getByText('My Description')).toBeInTheDocument();
    expect(screen.getByText('Main content')).toBeInTheDocument();
    expect(screen.getByText('Footer area')).toBeInTheDocument();
  });
});
