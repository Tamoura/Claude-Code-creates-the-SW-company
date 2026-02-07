import { render, screen } from '@testing-library/react';
import ActivityFeed from '../src/components/dashboard/ActivityFeed';

describe('ActivityFeed', () => {
  it('renders the Recent Activity heading', () => {
    render(<ActivityFeed />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('renders mock event items', () => {
    render(<ActivityFeed />);
    expect(screen.getByText('priya-dev')).toBeInTheDocument();
    expect(screen.getByText('alex-eng')).toBeInTheDocument();
    expect(screen.getByText('sam-dev')).toBeInTheDocument();
  });

  it('renders event titles', () => {
    render(<ActivityFeed />);
    expect(screen.getByText('Add user authentication middleware')).toBeInTheDocument();
    expect(screen.getByText('Refactor database connection pool')).toBeInTheDocument();
  });

  it('renders repo names for events', () => {
    render(<ActivityFeed />);
    const repoElements = screen.getAllByText('backend-api');
    expect(repoElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders timestamps for events', () => {
    render(<ActivityFeed />);
    expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
    expect(screen.getByText('15 minutes ago')).toBeInTheDocument();
  });

  it('renders within a card container', () => {
    const { container } = render(<ActivityFeed />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('rounded-xl');
    expect(card.className).toContain('bg-[var(--bg-card)]');
  });
});
