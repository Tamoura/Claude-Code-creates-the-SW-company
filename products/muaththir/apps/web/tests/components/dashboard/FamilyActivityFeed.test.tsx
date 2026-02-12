import React from 'react';
import { render, screen } from '@testing-library/react';
import FamilyActivityFeed from '../../../src/components/dashboard/FamilyActivityFeed';

describe('FamilyActivityFeed', () => {
  it('renders activity items from multiple children', () => {
    render(
      React.createElement(FamilyActivityFeed, {
        activities: [
          {
            id: 'obs-1',
            type: 'observation' as const,
            text: 'Completed math homework',
            childName: 'Ahmad',
            dimensionSlug: 'academic',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'ms-1',
            type: 'milestone' as const,
            text: 'Can ride a bicycle',
            childName: 'Sara',
            dimensionSlug: 'physical',
            timestamp: new Date().toISOString(),
          },
        ],
        loading: false,
      })
    );

    expect(screen.getByText('Completed math homework')).toBeInTheDocument();
    expect(screen.getByText('Can ride a bicycle')).toBeInTheDocument();
  });

  it('shows child names on each activity item', () => {
    render(
      React.createElement(FamilyActivityFeed, {
        activities: [
          {
            id: 'obs-1',
            type: 'observation' as const,
            text: 'Read a chapter',
            childName: 'Ahmad',
            dimensionSlug: 'academic',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'goal-1',
            type: 'goal' as const,
            text: 'Finish Quran revision',
            childName: 'Sara',
            dimensionSlug: 'islamic',
            timestamp: new Date().toISOString(),
          },
        ],
        loading: false,
      })
    );

    expect(screen.getByText('Ahmad')).toBeInTheDocument();
    expect(screen.getByText('Sara')).toBeInTheDocument();
  });

  it('handles empty state gracefully', () => {
    render(
      React.createElement(FamilyActivityFeed, {
        activities: [],
        loading: false,
      })
    );

    expect(screen.getByText(/no recent family activity/i)).toBeInTheDocument();
  });

  it('shows loading skeleton when loading', () => {
    render(
      React.createElement(FamilyActivityFeed, {
        activities: [],
        loading: true,
      })
    );

    expect(screen.queryByText(/no recent family activity/i)).not.toBeInTheDocument();
    // Should render loading skeletons
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays activity type labels', () => {
    render(
      React.createElement(FamilyActivityFeed, {
        activities: [
          {
            id: 'obs-1',
            type: 'observation' as const,
            text: 'Played with friends',
            childName: 'Ahmad',
            dimensionSlug: 'social_emotional',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'ms-1',
            type: 'milestone' as const,
            text: 'First prayer alone',
            childName: 'Sara',
            dimensionSlug: 'islamic',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'goal-1',
            type: 'goal' as const,
            text: 'Read 10 books',
            childName: 'Ahmad',
            dimensionSlug: 'academic',
            timestamp: new Date().toISOString(),
          },
        ],
        loading: false,
      })
    );

    // Uses the translation keys from the setup mock
    expect(screen.getByText('Observed')).toBeInTheDocument();
    expect(screen.getByText('Achieved milestone')).toBeInTheDocument();
    expect(screen.getByText('Completed goal')).toBeInTheDocument();
  });

  it('sorts activities by timestamp (newest first)', () => {
    const now = new Date();
    const older = new Date(now.getTime() - 86400000);

    render(
      React.createElement(FamilyActivityFeed, {
        activities: [
          {
            id: 'old-1',
            type: 'observation' as const,
            text: 'Old activity',
            childName: 'Ahmad',
            dimensionSlug: 'academic',
            timestamp: older.toISOString(),
          },
          {
            id: 'new-1',
            type: 'observation' as const,
            text: 'New activity',
            childName: 'Sara',
            dimensionSlug: 'academic',
            timestamp: now.toISOString(),
          },
        ],
        loading: false,
      })
    );

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('New activity');
    expect(items[1]).toHaveTextContent('Old activity');
  });

  it('limits display to 10 items', () => {
    const activities = Array.from({ length: 15 }, (_, i) => ({
      id: `act-${i}`,
      type: 'observation' as const,
      text: `Activity ${i}`,
      childName: i % 2 === 0 ? 'Ahmad' : 'Sara',
      dimensionSlug: 'academic',
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    }));

    render(
      React.createElement(FamilyActivityFeed, {
        activities,
        loading: false,
      })
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(10);
  });
});
