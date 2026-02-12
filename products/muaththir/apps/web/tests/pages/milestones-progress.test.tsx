import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MilestonesPage from '../../src/app/dashboard/milestones/page';

jest.setTimeout(10000);

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
  usePathname: () => '/dashboard/milestones',
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

const mockChild = {
  id: 'child-1',
  name: 'Sarah',
  dateOfBirth: '2020-01-01',
  gender: 'female' as const,
  ageBand: '3-4',
  photoUrl: null,
  medicalNotes: null,
  allergies: null,
  specialNeeds: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockDashboardData = {
  childId: 'child-1',
  childName: 'Sarah',
  ageBand: '3-4',
  overallScore: 65,
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
      score: 60,
      factors: { observation: 20, milestone: 20, sentiment: 20 },
      observationCount: 3,
      milestoneProgress: { achieved: 3, total: 10 },
    },
    {
      dimension: 'behavioural',
      score: 50,
      factors: { observation: 15, milestone: 15, sentiment: 20 },
      observationCount: 2,
      milestoneProgress: { achieved: 5, total: 10 },
    },
    {
      dimension: 'aspirational',
      score: 40,
      factors: { observation: 10, milestone: 10, sentiment: 20 },
      observationCount: 1,
      milestoneProgress: { achieved: 2, total: 10 },
    },
    {
      dimension: 'islamic',
      score: 70,
      factors: { observation: 25, milestone: 25, sentiment: 20 },
      observationCount: 4,
      milestoneProgress: { achieved: 7, total: 10 },
    },
    {
      dimension: 'physical',
      score: 55,
      factors: { observation: 18, milestone: 18, sentiment: 19 },
      observationCount: 3,
      milestoneProgress: { achieved: 4, total: 10 },
    },
  ],
  calculatedAt: '2024-01-01T00:00:00Z',
};

describe('MilestonesPage - Improved Progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetChildren.mockResolvedValue({
      data: [mockChild],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetDashboard.mockResolvedValue(mockDashboardData);
  });

  it('renders progress bars for each dimension', async () => {
    render(<MilestonesPage />);

    await waitFor(() => {
      const progressBars = screen.getAllByTestId(/progress-bar-/);
      expect(progressBars.length).toBe(6);
    });
  });

  it('shows percentage text on progress bars', async () => {
    render(<MilestonesPage />);

    await waitFor(() => {
      // Academic: 8/10 = 80%
      expect(screen.getByText('80%')).toBeInTheDocument();
      // Social-Emotional: 3/10 = 30%
      expect(screen.getByText('30%')).toBeInTheDocument();
    });
  });

  it('renders dimension names with the progress bars', async () => {
    render(<MilestonesPage />);

    await waitFor(() => {
      expect(screen.getByText('Academic')).toBeInTheDocument();
      expect(screen.getByText('Social-Emotional')).toBeInTheDocument();
      expect(screen.getByText('Behavioural')).toBeInTheDocument();
      expect(screen.getByText('Aspirational')).toBeInTheDocument();
      expect(screen.getByText('Islamic')).toBeInTheDocument();
      expect(screen.getByText('Physical')).toBeInTheDocument();
    });
  });

  it('shows achieved/total milestone counts', async () => {
    render(<MilestonesPage />);

    await waitFor(() => {
      // Multiple "completed" and "total" patterns
      const completedElements = screen.getAllByText(/\d+ completed/);
      expect(completedElements.length).toBeGreaterThanOrEqual(6);
    });
  });

  it('renders collapse/expand sections per dimension', async () => {
    render(<MilestonesPage />);

    await waitFor(() => {
      const expandButtons = screen.getAllByTestId(/dimension-toggle-/);
      expect(expandButtons.length).toBe(6);
    });
  });

  it('toggles dimension section visibility on click', async () => {
    render(<MilestonesPage />);

    const academicToggle = await screen.findByTestId('dimension-toggle-academic', {}, { timeout: 3000 });
    expect(academicToggle).toBeInTheDocument();

    // Click to expand
    fireEvent.click(academicToggle);

    // Wait for expanded content to appear
    const link = await screen.findByTestId('dimension-link-academic', {}, { timeout: 3000 });
    expect(link).toBeInTheDocument();
  });
});
