import { render, screen } from '@testing-library/react';
import DimensionCard from '../../src/components/dashboard/DimensionCard';
import { DIMENSIONS } from '../../src/lib/dimensions';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

describe('DimensionCard', () => {
  const academicDimension = DIMENSIONS[0]; // Academic

  it('renders the dimension name', () => {
    render(<DimensionCard dimension={academicDimension} />);
    expect(screen.getByText('Academic')).toBeInTheDocument();
  });

  it('renders the dimension description', () => {
    render(<DimensionCard dimension={academicDimension} />);
    expect(
      screen.getByText(academicDimension.description)
    ).toBeInTheDocument();
  });

  it('renders the score when provided', () => {
    render(<DimensionCard dimension={academicDimension} score={75} />);
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('renders the observation count', () => {
    render(
      <DimensionCard
        dimension={academicDimension}
        observationCount={5}
      />
    );
    expect(screen.getByText('5 observations')).toBeInTheDocument();
  });

  it('renders singular observation text for count of 1', () => {
    render(
      <DimensionCard
        dimension={academicDimension}
        observationCount={1}
      />
    );
    expect(screen.getByText('1 observation')).toBeInTheDocument();
  });

  it('links to the dimension detail page', () => {
    render(<DimensionCard dimension={academicDimension} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute(
      'href',
      '/dashboard/dimensions/academic'
    );
  });

  it('has accessible aria-label', () => {
    render(<DimensionCard dimension={academicDimension} score={42} />);
    expect(
      screen.getByLabelText('Academic dimension - score 42')
    ).toBeInTheDocument();
  });

  it('renders all six dimensions correctly', () => {
    const { container } = render(
      <div>
        {DIMENSIONS.map((d) => (
          <DimensionCard key={d.slug} dimension={d} />
        ))}
      </div>
    );
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(6);
  });
});
