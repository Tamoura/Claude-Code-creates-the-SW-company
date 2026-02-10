import React from 'react';
import { render } from '@testing-library/react-native';
import { ActivityItem } from '../src/components/ActivityItem';
import type { ActivityEvent } from '../src/types';

const mockEvent: ActivityEvent = {
  id: 'evt-1',
  type: 'push',
  author: 'janesmith',
  title: 'Fix auth middleware validation',
  repo: 'pulse-api',
  time: new Date().toISOString(),
};

describe('ActivityItem', () => {
  it('renders with correct testID', () => {
    const { getByTestId } = render(
      <ActivityItem event={mockEvent} />
    );
    expect(getByTestId('activity-item-evt-1')).toBeTruthy();
  });

  it('displays the event title', () => {
    const { getByText } = render(
      <ActivityItem event={mockEvent} />
    );
    expect(getByText('Fix auth middleware validation')).toBeTruthy();
  });

  it('displays the author', () => {
    const { getByText } = render(
      <ActivityItem event={mockEvent} />
    );
    expect(getByText('janesmith')).toBeTruthy();
  });

  it('displays the repo name', () => {
    const { getByText } = render(
      <ActivityItem event={mockEvent} />
    );
    expect(getByText('pulse-api')).toBeTruthy();
  });

  it('displays the event icon', () => {
    const { getByTestId } = render(
      <ActivityItem event={mockEvent} />
    );
    expect(getByTestId('event-icon-push')).toBeTruthy();
  });

  it('renders pr_merged event type', () => {
    const mergeEvent: ActivityEvent = {
      ...mockEvent,
      id: 'evt-2',
      type: 'pr_merged',
      title: 'Merge PR #42: Add risk engine',
    };
    const { getByText } = render(
      <ActivityItem event={mergeEvent} />
    );
    expect(getByText('Merge PR #42: Add risk engine')).toBeTruthy();
  });
});
