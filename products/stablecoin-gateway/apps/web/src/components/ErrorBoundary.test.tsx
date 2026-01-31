import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

// A helper component that throws on render
function ThrowingChild({ message }: { message: string }) {
  throw new Error(message);
}

describe('ErrorBoundary', () => {
  // Suppress React error boundary console.error noise in test output
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <p>All good here</p>
      </ErrorBoundary>
    );

    expect(screen.getByText('All good here')).toBeInTheDocument();
  });

  it('renders error fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="test explosion" />
      </ErrorBoundary>
    );

    expect(
      screen.getByRole('heading', { name: 'Oops! Something went wrong' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'We encountered an unexpected error. Please try refreshing the page.'
      )
    ).toBeInTheDocument();
  });

  it('displays technical details with the error message', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="kaboom" />
      </ErrorBoundary>
    );

    // The details/summary section should be present
    expect(screen.getByText('Technical details')).toBeInTheDocument();
    expect(screen.getByText(/kaboom/)).toBeInTheDocument();
  });

  it('renders a "Go to Homepage" button', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="oops" />
      </ErrorBoundary>
    );

    const button = screen.getByRole('button', { name: 'Go to Homepage' });
    expect(button).toBeInTheDocument();
  });
});
