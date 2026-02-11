import React from 'react';
import { render, screen } from '@testing-library/react';
import ActivityFeed from '../../../src/components/dashboard/ActivityFeed';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('ActivityFeed', () => {
  it('renders the activity feed title', () => {
    render(<ActivityFeed />);
    expect(screen.getByText('activityFeed')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(<ActivityFeed observations={[]} milestones={[]} goals={[]} />);
    expect(screen.getByText('activityNoItems')).toBeInTheDocument();
  });

  it('renders observations', () => {
    render(
      <ActivityFeed
        observations={[
          {
            id: '1',
            content: 'Did homework independently',
            dimensionSlug: 'academic',
            sentiment: 'positive',
            createdAt: new Date().toISOString(),
          },
        ]}
      />
    );
    expect(screen.getByText('Did homework independently')).toBeInTheDocument();
    expect(screen.getByText('activityObserved')).toBeInTheDocument();
  });

  it('renders achieved milestones', () => {
    render(
      <ActivityFeed
        milestones={[
          {
            id: '1',
            title: 'Can count to 100',
            dimensionSlug: 'academic',
            achievedAt: new Date().toISOString(),
          },
        ]}
      />
    );
    expect(screen.getByText('Can count to 100')).toBeInTheDocument();
    expect(screen.getByText('activityAchieved')).toBeInTheDocument();
  });

  it('renders completed goals', () => {
    render(
      <ActivityFeed
        goals={[
          {
            id: '1',
            title: 'Read 10 books',
            dimensionSlug: 'academic',
            status: 'completed',
            updatedAt: new Date().toISOString(),
          },
        ]}
      />
    );
    expect(screen.getByText('Read 10 books')).toBeInTheDocument();
    expect(screen.getByText('activityCompleted')).toBeInTheDocument();
  });

  it('sorts items by timestamp (newest first)', () => {
    const now = new Date();
    const older = new Date(now.getTime() - 86400000);
    render(
      <ActivityFeed
        observations={[
          {
            id: '1',
            content: 'Older observation',
            dimensionSlug: 'academic',
            sentiment: 'positive',
            createdAt: older.toISOString(),
          },
          {
            id: '2',
            content: 'Newer observation',
            dimensionSlug: 'islamic',
            sentiment: 'positive',
            createdAt: now.toISOString(),
          },
        ]}
      />
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Newer observation');
    expect(items[1]).toHaveTextContent('Older observation');
  });

  it('limits display to 5 items', () => {
    const observations = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      content: `Observation ${i}`,
      dimensionSlug: 'academic',
      sentiment: 'positive',
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    }));
    render(<ActivityFeed observations={observations} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(5);
  });
});
