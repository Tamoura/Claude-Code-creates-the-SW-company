import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ComparePage from '../../src/app/dashboard/compare/page';

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
  usePathname: () => '/dashboard/compare',
}));

// Mock next/dynamic for RadarChart
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    return function MockDynamicComponent(props: { scores?: unknown[] }) {
      return <div data-testid="radar-chart-mock">{JSON.stringify(props)}</div>;
    };
  },
}));

// Mock API client
jest.mock('../../src/lib/api-client', () => ({
  apiClient: {
    getChildren: jest.fn(),
    getDashboard: jest.fn(),
  },
}));

import { apiClient } from '../../src/lib/api-client';
const mockGetChildren = apiClient.getChildren as jest.Mock;
const mockGetDashboard = apiClient.getDashboard as jest.Mock;

const mockChild1 = {
  id: 'child-1',
  name: 'Sarah',
  dateOfBirth: '2020-01-01',
  gender: 'female' as const,
  ageBand: '3-4',
  photoUrl: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockChild2 = {
  id: 'child-2',
  name: 'Ahmed',
  dateOfBirth: '2018-06-15',
  gender: 'male' as const,
  ageBand: '5-6',
  photoUrl: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const makeDashboardData = (childId: string, childName: string, overallScore: number) => ({
  childId,
  childName,
  ageBand: '3-4',
  overallScore,
  dimensions: [
    {
      dimension: 'academic',
      score: 80,
      factors: { observation: 30, milestone: 30, sentiment: 20 },
      observationCount: 5,
      milestoneProgress: { achieved: 8, total: 10 },
    },
    {
      dimension: 'social_emotional',
      score: 65,
      factors: { observation: 25, milestone: 20, sentiment: 20 },
      observationCount: 3,
      milestoneProgress: { achieved: 5, total: 10 },
    },
    {
      dimension: 'behavioural',
      score: 70,
      factors: { observation: 28, milestone: 22, sentiment: 20 },
      observationCount: 4,
      milestoneProgress: { achieved: 6, total: 10 },
    },
    {
      dimension: 'aspirational',
      score: 55,
      factors: { observation: 20, milestone: 15, sentiment: 20 },
      observationCount: 2,
      milestoneProgress: { achieved: 3, total: 10 },
    },
    {
      dimension: 'islamic',
      score: 90,
      factors: { observation: 35, milestone: 35, sentiment: 20 },
      observationCount: 7,
      milestoneProgress: { achieved: 9, total: 10 },
    },
    {
      dimension: 'physical',
      score: 60,
      factors: { observation: 22, milestone: 18, sentiment: 20 },
      observationCount: 3,
      milestoneProgress: { achieved: 4, total: 10 },
    },
  ],
  calculatedAt: '2024-01-01T00:00:00Z',
});

describe('ComparePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows no-children state when user has no children', async () => {
    mockGetChildren.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false },
    });

    render(<ComparePage />);

    await waitFor(() => {
      expect(screen.getByText(/No children found/i)).toBeInTheDocument();
    });
  });

  it('shows need-two-children state with only one child', async () => {
    mockGetChildren.mockResolvedValue({
      data: [mockChild1],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });

    render(<ComparePage />);

    await waitFor(() => {
      expect(screen.getByText(/Two or more children needed/i)).toBeInTheDocument();
    });
  });

  it('renders comparison view with two children', async () => {
    mockGetChildren.mockResolvedValue({
      data: [mockChild1, mockChild2],
      pagination: { page: 1, limit: 50, total: 2, totalPages: 1, hasMore: false },
    });
    mockGetDashboard
      .mockResolvedValueOnce(makeDashboardData('child-1', 'Sarah', 70))
      .mockResolvedValueOnce(makeDashboardData('child-2', 'Ahmed', 65));

    render(<ComparePage />);

    await waitFor(() => {
      expect(screen.getByText('Compare Children')).toBeInTheDocument();
      // Sarah appears in chip, card heading, and table header
      expect(screen.getAllByText('Sarah').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Ahmed').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders radar charts for selected children', async () => {
    mockGetChildren.mockResolvedValue({
      data: [mockChild1, mockChild2],
      pagination: { page: 1, limit: 50, total: 2, totalPages: 1, hasMore: false },
    });
    mockGetDashboard
      .mockResolvedValueOnce(makeDashboardData('child-1', 'Sarah', 70))
      .mockResolvedValueOnce(makeDashboardData('child-2', 'Ahmed', 65));

    render(<ComparePage />);

    await waitFor(() => {
      const radarCharts = screen.getAllByTestId('radar-chart-mock');
      expect(radarCharts.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows overall scores for each child', async () => {
    mockGetChildren.mockResolvedValue({
      data: [mockChild1, mockChild2],
      pagination: { page: 1, limit: 50, total: 2, totalPages: 1, hasMore: false },
    });
    mockGetDashboard
      .mockResolvedValueOnce(makeDashboardData('child-1', 'Sarah', 72))
      .mockResolvedValueOnce(makeDashboardData('child-2', 'Ahmed', 63));

    render(<ComparePage />);

    await waitFor(() => {
      // Overall scores shown as large numbers
      expect(screen.getByText('72')).toBeInTheDocument();
      expect(screen.getByText('63')).toBeInTheDocument();
    });
  });

  it('shows dimension breakdown table', async () => {
    mockGetChildren.mockResolvedValue({
      data: [mockChild1, mockChild2],
      pagination: { page: 1, limit: 50, total: 2, totalPages: 1, hasMore: false },
    });
    mockGetDashboard
      .mockResolvedValueOnce(makeDashboardData('child-1', 'Sarah', 70))
      .mockResolvedValueOnce(makeDashboardData('child-2', 'Ahmed', 65));

    render(<ComparePage />);

    await waitFor(() => {
      expect(screen.getByText('Dimension Breakdown')).toBeInTheDocument();
      // Check dimension names appear
      expect(screen.getAllByText('Academic').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Islamic').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('handles API error gracefully', async () => {
    mockGetChildren.mockRejectedValue(new Error('Network error'));

    render(<ComparePage />);

    await waitFor(() => {
      // Shows error message when API fails
      expect(screen.getByText('errorLoading')).toBeInTheDocument();
    });
  });
});
