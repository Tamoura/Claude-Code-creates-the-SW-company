import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../src/components/common/ErrorBoundary';

function ThrowingComponent(): JSX.Element {
  throw new Error('Test error');
}

function GoodComponent() {
  return <div>Working content</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for the error boundary tests
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Working content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders a homepage button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Go to Homepage')).toBeInTheDocument();
  });

  it('shows technical details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Technical details')).toBeInTheDocument();

    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
    });
  });
});
