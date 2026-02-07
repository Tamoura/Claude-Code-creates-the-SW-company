import { render, screen, fireEvent, act } from '@testing-library/react';
import ActivityPage from '../src/app/dashboard/activity/page';

// Mock the useWebSocket hook
const mockSend = jest.fn();
let mockIsConnected = true;
let mockLastMessage: unknown = null;

jest.mock('../src/hooks/useWebSocket', () => ({
  useWebSocket: ({ onMessage }: { onMessage?: (msg: unknown) => void }) => {
    // Store onMessage for tests to trigger
    (global as Record<string, unknown>).__wsOnMessage = onMessage;
    return {
      isConnected: mockIsConnected,
      lastMessage: mockLastMessage,
      send: mockSend,
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  },
}));

describe('Activity Page', () => {
  beforeEach(() => {
    mockIsConnected = true;
    mockLastMessage = null;
    mockSend.mockClear();
  });

  it('renders the page heading', () => {
    render(<ActivityPage />);
    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<ActivityPage />);
    expect(
      screen.getByText(/real-time development activity/i)
    ).toBeInTheDocument();
  });

  it('renders a connection status indicator', () => {
    render(<ActivityPage />);
    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
  });

  it('shows connected status when WebSocket is connected', () => {
    mockIsConnected = true;
    render(<ActivityPage />);
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it('shows disconnected status when WebSocket is not connected', () => {
    mockIsConnected = false;
    render(<ActivityPage />);
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
  });

  it('renders filter buttons for repository and type', () => {
    render(<ActivityPage />);
    expect(screen.getByTestId('filter-repo')).toBeInTheDocument();
    expect(screen.getByTestId('filter-type')).toBeInTheDocument();
  });

  it('renders a repo filter select with All Repos option', () => {
    render(<ActivityPage />);
    const repoFilter = screen.getByTestId('filter-repo');
    expect(repoFilter).toBeInTheDocument();
    expect(screen.getByText('All Repos')).toBeInTheDocument();
  });

  it('renders a type filter select with All Types option', () => {
    render(<ActivityPage />);
    const typeFilter = screen.getByTestId('filter-type');
    expect(typeFilter).toBeInTheDocument();
    expect(screen.getByText('All Types')).toBeInTheDocument();
  });

  it('renders an empty state message when no events', () => {
    render(<ActivityPage />);
    expect(
      screen.getByText(/waiting for activity/i)
    ).toBeInTheDocument();
  });

  it('renders event items when events are present', () => {
    render(<ActivityPage />);
    const onMessage = (global as Record<string, unknown>).__wsOnMessage as (msg: unknown) => void;
    if (onMessage) {
      act(() => {
        onMessage({
          type: 'activity',
          data: {
            id: 'evt-1',
            type: 'pull_request.merged',
            author: 'priya-dev',
            title: 'Add authentication',
            repo: 'backend-api',
            time: '2 minutes ago',
          },
        });
      });
    }
    expect(screen.getByText('priya-dev')).toBeInTheDocument();
    expect(screen.getByText('Add authentication')).toBeInTheDocument();
    // backend-api appears in both filter dropdown and event
    const backendApiElements = screen.getAllByText('backend-api');
    expect(backendApiElements.length).toBeGreaterThanOrEqual(1);
  });
});
