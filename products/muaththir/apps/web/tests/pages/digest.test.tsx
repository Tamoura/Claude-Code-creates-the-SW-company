import { render, screen, waitFor } from '@testing-library/react';
import DigestPage from '../../src/app/dashboard/digest/page';

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
  usePathname: () => '/dashboard/digest',
}));

// Mock API client
jest.mock('../../src/lib/api-client', () => ({
  apiClient: {
    getWeeklyDigest: jest.fn(),
  },
}));

import { apiClient } from '../../src/lib/api-client';
const mockGetWeeklyDigest = apiClient.getWeeklyDigest as jest.Mock;

// ==================== Mock Data ====================

const MOCK_DIGEST = {
  period: { from: '2026-02-05', to: '2026-02-12' },
  children: [
    {
      childId: 'child-1',
      childName: 'Ahmad',
      observationCount: 5,
      milestonesAchieved: 2,
      topDimension: 'academic',
      areasNeedingAttention: ['physical'],
    },
    {
      childId: 'child-2',
      childName: 'Fatima',
      observationCount: 3,
      milestonesAchieved: 1,
      topDimension: 'islamic',
      areasNeedingAttention: ['behavioural', 'aspirational'],
    },
  ],
  overall: { totalObservations: 8, totalMilestones: 3 },
};

const MOCK_EMPTY_DIGEST = {
  period: { from: '2026-02-05', to: '2026-02-12' },
  children: [],
  overall: { totalObservations: 0, totalMilestones: 0 },
};

// ==================== Tests ====================

describe('DigestPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockGetWeeklyDigest.mockReturnValue(new Promise(() => {})); // Never resolves

    render(<DigestPage />);

    // Should show loading skeletons (animate-pulse)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no children exist', async () => {
    mockGetWeeklyDigest.mockResolvedValue(MOCK_EMPTY_DIGEST);

    render(<DigestPage />);

    await waitFor(() => {
      expect(screen.getByText('No activity this week')).toBeInTheDocument();
    });
  });

  it('renders child cards with observation counts', async () => {
    mockGetWeeklyDigest.mockResolvedValue(MOCK_DIGEST);

    render(<DigestPage />);

    await waitFor(() => {
      // Child names should appear
      expect(screen.getByText('Ahmad')).toBeInTheDocument();
      expect(screen.getByText('Fatima')).toBeInTheDocument();
    });

    // Observation counts: 5 for Ahmad, 3 for Fatima
    // Use getAllByText since '3' appears in overall summary too
    expect(screen.getByText('5')).toBeInTheDocument();
    const threes = screen.getAllByText('3');
    expect(threes.length).toBeGreaterThanOrEqual(2); // overall milestones + Fatima observations
  });

  it('renders milestone counts for each child', async () => {
    mockGetWeeklyDigest.mockResolvedValue(MOCK_DIGEST);

    render(<DigestPage />);

    await waitFor(() => {
      expect(screen.getByText('Ahmad')).toBeInTheDocument();
    });

    // Milestone counts: 2 for Ahmad, 1 for Fatima
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders top dimension badge for each child', async () => {
    mockGetWeeklyDigest.mockResolvedValue(MOCK_DIGEST);

    render(<DigestPage />);

    await waitFor(() => {
      // Top dimensions should be displayed using dimension translations
      expect(screen.getByText('Academic')).toBeInTheDocument();
      expect(screen.getByText('Islamic')).toBeInTheDocument();
    });
  });

  it('renders areas needing attention', async () => {
    mockGetWeeklyDigest.mockResolvedValue(MOCK_DIGEST);

    render(<DigestPage />);

    await waitFor(() => {
      expect(screen.getByText('Ahmad')).toBeInTheDocument();
    });

    // Areas needing attention use dimension translations
    expect(screen.getByText('Physical')).toBeInTheDocument();
    expect(screen.getByText('Behavioural')).toBeInTheDocument();
    expect(screen.getByText('Aspirational')).toBeInTheDocument();
  });

  it('renders overall summary at the top', async () => {
    mockGetWeeklyDigest.mockResolvedValue(MOCK_DIGEST);

    render(<DigestPage />);

    await waitFor(() => {
      // Overall summary section
      expect(screen.getByText('Overall Summary')).toBeInTheDocument();
    });

    // Total counts from overall
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('displays the period date range', async () => {
    mockGetWeeklyDigest.mockResolvedValue(MOCK_DIGEST);

    render(<DigestPage />);

    await waitFor(() => {
      // Period dates should be displayed (en-GB format: "5 Feb 2026")
      expect(screen.getByText(/5 Feb 2026/)).toBeInTheDocument();
      expect(screen.getByText(/12 Feb 2026/)).toBeInTheDocument();
    });
  });

  it('displays error state when API fails', async () => {
    mockGetWeeklyDigest.mockRejectedValue(new Error('Network error'));

    render(<DigestPage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows page title and subtitle', async () => {
    mockGetWeeklyDigest.mockResolvedValue(MOCK_DIGEST);

    render(<DigestPage />);

    await waitFor(() => {
      expect(screen.getByText('Weekly Digest')).toBeInTheDocument();
      expect(
        screen.getByText("A summary of your children's progress this week.")
      ).toBeInTheDocument();
    });
  });
});
