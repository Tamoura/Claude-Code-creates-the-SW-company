import { render, screen } from '@testing-library/react';
import DimensionBadge from '../../src/components/common/DimensionBadge';

describe('DimensionBadge', () => {
  it('renders the dimension name for a valid slug', () => {
    render(<DimensionBadge slug="academic" />);
    expect(screen.getByText('Academic')).toBeInTheDocument();
  });

  it('renders the colour dot', () => {
    const { container } = render(<DimensionBadge slug="islamic" />);
    const dot = container.querySelector('span > span');
    expect(dot).toHaveStyle({ backgroundColor: '#10B981' });
  });

  it('renders the slug text for unknown dimensions', () => {
    render(<DimensionBadge slug="unknown" />);
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  it('supports md size', () => {
    render(<DimensionBadge slug="academic" size="md" />);
    const badge = screen.getByText('Academic').closest('span');
    expect(badge?.className).toContain('text-sm');
  });

  it('renders all dimension slugs correctly', () => {
    const slugs = [
      'academic',
      'social_emotional',
      'behavioural',
      'aspirational',
      'islamic',
      'physical',
    ];
    const { container } = render(
      <div>
        {slugs.map((slug) => (
          <DimensionBadge key={slug} slug={slug} />
        ))}
      </div>
    );
    expect(container.querySelectorAll('span > span')).toHaveLength(6);
  });
});
