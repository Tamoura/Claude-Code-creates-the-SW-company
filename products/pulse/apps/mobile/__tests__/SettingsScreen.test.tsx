import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SettingsScreen } from '../src/screens/SettingsScreen';

// Mock auth store
const mockLogout = jest.fn();
jest.mock('../src/store/auth-store', () => ({
  useAuthStore: jest.fn(() => ({
    user: { id: '1', name: 'Jane Smith', email: 'jane@example.com' },
    logout: mockLogout,
  })),
}));

// Mock push notifications hook
jest.mock('../src/hooks/usePushNotifications', () => ({
  usePushNotifications: jest.fn(() => ({
    expoPushToken: 'ExponentPushToken[test-token]',
    notification: null,
    error: null,
  })),
}));

// Spy on Alert
jest.spyOn(Alert, 'alert');

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the settings title', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Settings')).toBeTruthy();
  });

  it('displays user profile info', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('user-name')).toBeTruthy();
    expect(getByTestId('user-email')).toBeTruthy();
  });

  it('displays the user name correctly', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Jane Smith')).toBeTruthy();
  });

  it('displays the user email correctly', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('jane@example.com')).toBeTruthy();
  });

  it('renders notification toggles', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('push-toggle')).toBeTruthy();
    expect(getByTestId('risk-alerts-toggle')).toBeTruthy();
    expect(getByTestId('anomaly-alerts-toggle')).toBeTruthy();
    expect(getByTestId('pr-alerts-toggle')).toBeTruthy();
  });

  it('renders logout button', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('logout-button')).toBeTruthy();
  });

  it('shows alert confirmation on logout press', () => {
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId('logout-button'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out?',
      expect.any(Array)
    );
  });

  it('displays push token', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('push-token')).toBeTruthy();
  });

  it('displays user avatar with first letter', () => {
    const { getByTestId, getByText } = render(<SettingsScreen />);
    expect(getByTestId('user-avatar')).toBeTruthy();
    expect(getByText('J')).toBeTruthy();
  });

  it('toggles notification switches', () => {
    const { getByTestId } = render(<SettingsScreen />);
    const pushToggle = getByTestId('push-toggle');
    fireEvent(pushToggle, 'valueChange', false);
    // Toggle state changes are internal; verify the component did not crash
    expect(pushToggle).toBeTruthy();
  });
});
