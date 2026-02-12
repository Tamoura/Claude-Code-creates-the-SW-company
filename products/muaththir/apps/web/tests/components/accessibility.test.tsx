import { render, screen } from '@testing-library/react';
import DimensionCard from '../../src/components/dashboard/DimensionCard';
import QuickLog from '../../src/components/dashboard/QuickLog';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    const React = require('react');
    return React.createElement('a', { href, ...props }, children);
  };
});

// Mock api-client
jest.mock('../../src/lib/api-client', () => ({
  apiClient: {
    createObservation: jest.fn(),
  },
}));

describe('DimensionCard accessibility', () => {
  const dimension = {
    slug: 'academic',
    label: 'Academic',
    colour: '#3B82F6',
    icon: 'Book',
  };

  it('has dark mode text color on heading', () => {
    const { container } = render(
      <DimensionCard dimension={dimension} score={75} observationCount={10} />
    );
    const h3 = container.querySelector('h3');
    expect(h3).not.toBeNull();
    // Check that the className includes dark:text-white
    expect(h3!.className).toContain('dark:text-white');
  });

  it('has dark mode text color on description', () => {
    const { container } = render(
      <DimensionCard dimension={dimension} score={75} observationCount={10} />
    );
    const description = container.querySelector('p');
    expect(description).not.toBeNull();
    expect(description!.className).toContain('dark:text-slate-400');
  });
});

describe('QuickLog accessibility', () => {
  it('has aria-label on the text input', () => {
    render(<QuickLog childId="child-1" />);
    const input = screen.getByPlaceholderText('What did you observe?');
    expect(input).toHaveAttribute('aria-label');
  });
});
