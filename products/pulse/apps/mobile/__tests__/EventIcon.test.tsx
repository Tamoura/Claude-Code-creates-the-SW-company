import React from 'react';
import { render } from '@testing-library/react-native';
import { EventIcon } from '../src/components/EventIcon';

describe('EventIcon', () => {
  it('renders with correct testID for push type', () => {
    const { getByTestId } = render(<EventIcon type="push" />);
    expect(getByTestId('event-icon-push')).toBeTruthy();
  });

  it('renders with correct testID for pr_merged type', () => {
    const { getByTestId } = render(<EventIcon type="pr_merged" />);
    expect(getByTestId('event-icon-pr_merged')).toBeTruthy();
  });

  it('renders with correct testID for pr_opened type', () => {
    const { getByTestId } = render(<EventIcon type="pr_opened" />);
    expect(getByTestId('event-icon-pr_opened')).toBeTruthy();
  });

  it('renders with correct testID for deployment type', () => {
    const { getByTestId } = render(<EventIcon type="deployment" />);
    expect(getByTestId('event-icon-deployment')).toBeTruthy();
  });

  it('renders with correct accessibility label', () => {
    const { getByLabelText } = render(<EventIcon type="push" />);
    expect(getByLabelText('Push')).toBeTruthy();
  });

  it('renders with custom size', () => {
    const { getByTestId } = render(
      <EventIcon type="review" size={48} />
    );
    expect(getByTestId('event-icon-review')).toBeTruthy();
  });
});
