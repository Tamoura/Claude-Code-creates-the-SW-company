import { render, screen } from '@testing-library/react';

// Mock window.matchMedia for ThemeToggle
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock next/navigation before importing the component
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    const React = require('react');
    return React.createElement('a', { href, ...props }, children);
  };
});

// Mock token manager to simulate authenticated state
jest.mock('../../src/lib/token-manager', () => ({
  TokenManager: {
    hasToken: () => true,
    getToken: () => 'mock-token',
  },
}));

import DashboardLayout from '../../src/components/layout/DashboardLayout';

// A component that throws on render
function ThrowingChild() {
  throw new Error('Child component crashed');
}

// Suppress console.error for expected error boundary logs
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
      msg.includes('Error: Uncaught') ||
      msg.includes('The above error occurred')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('DashboardLayout with ErrorBoundary', () => {
  it('renders children normally', () => {
    render(
      <DashboardLayout>
        <div>Dashboard content</div>
      </DashboardLayout>
    );
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });

  it('catches child rendering errors and shows fallback', () => {
    render(
      <DashboardLayout>
        <ThrowingChild />
      </DashboardLayout>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
