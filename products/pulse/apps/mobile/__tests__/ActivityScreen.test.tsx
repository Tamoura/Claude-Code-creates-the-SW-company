import React from 'react';
import { render } from '@testing-library/react-native';
import { ActivityScreen } from '../src/screens/ActivityScreen';

// Mock useWebSocket
jest.mock('../src/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(() => ({
    isConnected: false,
    error: null,
    reconnect: jest.fn(),
  })),
}));

describe('ActivityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen title', () => {
    const { getByText } = render(<ActivityScreen />);
    expect(getByText('Activity')).toBeTruthy();
  });

  it('shows empty state when no events', () => {
    const { getByTestId, getByText } = render(<ActivityScreen />);
    expect(getByTestId('empty-state')).toBeTruthy();
    expect(getByText('No activity yet')).toBeTruthy();
  });

  it('shows disconnected status when not connected', () => {
    const { getByText } = render(<ActivityScreen />);
    expect(getByText('Disconnected')).toBeTruthy();
  });

  it('shows live status when connected', () => {
    const { useWebSocket } = require('../src/hooks/useWebSocket');
    (useWebSocket as jest.Mock).mockReturnValue({
      isConnected: true,
      error: null,
      reconnect: jest.fn(),
    });

    const { getByText } = render(<ActivityScreen />);
    expect(getByText('Live')).toBeTruthy();
  });

  it('shows error message when WebSocket has error', () => {
    const { useWebSocket } = require('../src/hooks/useWebSocket');
    (useWebSocket as jest.Mock).mockReturnValue({
      isConnected: false,
      error: 'Connection failed',
      reconnect: jest.fn(),
    });

    const { getByText } = render(<ActivityScreen />);
    expect(getByText('Connection failed')).toBeTruthy();
  });
});
