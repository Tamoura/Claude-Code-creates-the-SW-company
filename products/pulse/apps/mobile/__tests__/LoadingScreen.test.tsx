import React from 'react';
import { render } from '@testing-library/react-native';
import { LoadingScreen } from '../src/components/LoadingScreen';

describe('LoadingScreen', () => {
  it('renders with default message', () => {
    const { getByText, getByTestId } = render(<LoadingScreen />);
    expect(getByTestId('loading-screen')).toBeTruthy();
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('renders with custom message', () => {
    const { getByText } = render(
      <LoadingScreen message="Starting Pulse..." />
    );
    expect(getByText('Starting Pulse...')).toBeTruthy();
  });
});
