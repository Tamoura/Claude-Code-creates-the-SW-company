import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '../../src/app/dashboard/page';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

// Mock next/dynamic for RadarChart
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    return function MockDynamicComponent(props: unknown) {
      return <div data-testid="radar-chart-mock">{JSON.stringify(props)}</div>;
    };
  },
}));

// Mock API client
jest.mock('../../src/lib/api-client', () => ({
  apiClient: {
    getChildren: jest.fn(),
    getDashboard: jest.fn(),
    getRecentObservations: jest.fn(),
    getMilestonesDue: jest.fn(),
    createObservation: jest.fn(),
  },
}));

import { apiClient } from '../../src/lib/api-client';
const mockGetChildren = apiClient.getChildren as jest.Mock;
const mockGetDashboard = apiClient.getDashboard as jest.Mock;
const mockGetRecentObservations = apiClient.getRecentObservations as jest.Mock;
const mockGetMilestonesDue = apiClient.getMilestonesDue as jest.Mock;

const makeChild = () => ({
  id: 'child-1',
  name: 'Sarah',
  dateOfBirth: '2020-01-01',
  gender: 'female' as const,
  ageBand: '3-4',
  photoUrl: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
});

const makeDashboard = (observationCount = 5) => ({
  childId: 'child-1',
  childName: 'Sarah',
  ageBand: '3-4',
  overallScore: 75,
  dimensions: [
    {
      dimension: 'academic',
      score: 80,
      factors: { observation: 30, milestone: 30, sentiment: 20 },
      observationCount,
      milestoneProgress: { achieved: 8, total: 10 },
    },
  ],
  calculatedAt: '2024-01-01T00:00:00Z',
});

describe('Dashboard Streak Counter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows best streak label in stats section', async () => {
    mockGetChildren.mockResolvedValue({
      data: [makeChild()],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetDashboard.mockResolvedValue(makeDashboard());
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    mockGetRecentObservations.mockResolvedValue({
      data: [
        {
          id: 'obs-1', childId: 'child-1', dimension: 'academic',
          content: 'Test', sentiment: 'positive',
          observedAt: today.toISOString(), tags: [],
          createdAt: today.toISOString(), updatedAt: today.toISOString(),
        },
        {
          id: 'obs-2', childId: 'child-1', dimension: 'academic',
          content: 'Test 2', sentiment: 'positive',
          observedAt: yesterday.toISOString(), tags: [],
          createdAt: yesterday.toISOString(), updatedAt: yesterday.toISOString(),
        },
        {
          id: 'obs-3', childId: 'child-1', dimension: 'academic',
          content: 'Test 3', sentiment: 'positive',
          observedAt: twoDaysAgo.toISOString(), tags: [],
          createdAt: twoDaysAgo.toISOString(), updatedAt: twoDaysAgo.toISOString(),
        },
      ],
    });
    mockGetMilestonesDue.mockResolvedValue({ data: [] });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-best-streak')).toBeInTheDocument();
    });
  });

  it('shows motivational message based on streak length', async () => {
    mockGetChildren.mockResolvedValue({
      data: [makeChild()],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetDashboard.mockResolvedValue(makeDashboard());
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    mockGetRecentObservations.mockResolvedValue({
      data: [
        {
          id: 'obs-1', childId: 'child-1', dimension: 'academic',
          content: 'Test', sentiment: 'positive',
          observedAt: today.toISOString(), tags: [],
          createdAt: today.toISOString(), updatedAt: today.toISOString(),
        },
        {
          id: 'obs-2', childId: 'child-1', dimension: 'academic',
          content: 'Test 2', sentiment: 'positive',
          observedAt: yesterday.toISOString(), tags: [],
          createdAt: yesterday.toISOString(), updatedAt: yesterday.toISOString(),
        },
      ],
    });
    mockGetMilestonesDue.mockResolvedValue({ data: [] });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('streak-message')).toBeInTheDocument();
    });
  });

  it('shows fire icon when streak is active', async () => {
    mockGetChildren.mockResolvedValue({
      data: [makeChild()],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetDashboard.mockResolvedValue(makeDashboard());
    const today = new Date();
    mockGetRecentObservations.mockResolvedValue({
      data: [
        {
          id: 'obs-1', childId: 'child-1', dimension: 'academic',
          content: 'Test', sentiment: 'positive',
          observedAt: today.toISOString(), tags: [],
          createdAt: today.toISOString(), updatedAt: today.toISOString(),
        },
      ],
    });
    mockGetMilestonesDue.mockResolvedValue({ data: [] });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('streak-fire-icon')).toBeInTheDocument();
    });
  });

  it('shows zero streak state with no observations', async () => {
    mockGetChildren.mockResolvedValue({
      data: [makeChild()],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetDashboard.mockResolvedValue(makeDashboard(0));
    mockGetRecentObservations.mockResolvedValue({ data: [] });
    mockGetMilestonesDue.mockResolvedValue({ data: [] });

    render(<DashboardPage />);

    await waitFor(() => {
      // Current streak should show 0
      expect(screen.getByTestId('stats-current-streak')).toHaveTextContent('0');
    });
  });
});
