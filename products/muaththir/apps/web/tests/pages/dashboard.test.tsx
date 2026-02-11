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
  default: (importFunc: () => Promise<{ default: React.ComponentType }>) => {
    return function MockDynamicComponent(props: unknown) {
      return <div data-testid="radar-chart-mock">{JSON.stringify(props)}</div>;
    };
  },
}));

// Mock API client
const mockGetChildren = jest.fn();
const mockGetDashboard = jest.fn();
const mockGetRecentObservations = jest.fn();
const mockGetMilestonesDue = jest.fn();

jest.mock('../../src/lib/api-client', () => ({
  apiClient: {
    getChildren: mockGetChildren,
    getDashboard: mockGetDashboard,
    getRecentObservations: mockGetRecentObservations,
    getMilestonesDue: mockGetMilestonesDue,
  },
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockGetChildren.mockReturnValue(new Promise(() => {})); // Never resolves

    render(<DashboardPage />);

    // Check for loading skeleton
    const loadingElements = screen.getAllByLabelText(/loading/i);
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('shows "No children" state when user has no children', async () => {
    mockGetChildren.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Add Your First Child/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Create a child profile to start tracking/)
      ).toBeInTheDocument();
    });

    // Check for add child button
    const addButton = screen.getByText(/Add Child Profile/i);
    expect(addButton.closest('a')).toHaveAttribute('href', '/onboarding/child');
  });

  it('renders dashboard content with child data', async () => {
    const mockChild = {
      id: 'child-1',
      name: 'Sarah',
      dateOfBirth: '2020-01-01',
      gender: 'female' as const,
      ageBand: '3-4',
      photoUrl: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const mockDashboardData = {
      childId: 'child-1',
      childName: 'Sarah',
      ageBand: '3-4',
      overallScore: 75.5,
      dimensions: [
        {
          dimension: 'academic',
          score: 80,
          factors: { observation: 30, milestone: 30, sentiment: 20 },
          observationCount: 5,
          milestoneProgress: { achieved: 8, total: 10 },
        },
      ],
      calculatedAt: '2024-01-01T00:00:00Z',
    };

    mockGetChildren.mockResolvedValue({
      data: [mockChild],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetDashboard.mockResolvedValue(mockDashboardData);
    mockGetRecentObservations.mockResolvedValue({ data: [] });
    mockGetMilestonesDue.mockResolvedValue({ data: [] });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(
        screen.getByText(/Sarah's development at a glance/)
      ).toBeInTheDocument();
    });

    // Check for overall score
    await waitFor(() => {
      expect(screen.getByText(/Overall development score: 75.5/i)).toBeInTheDocument();
    });
  });

  it('renders dimension cards section', async () => {
    mockGetChildren.mockResolvedValue({
      data: [
        {
          id: 'child-1',
          name: 'Test Child',
          dateOfBirth: '2020-01-01',
          gender: 'female' as const,
          ageBand: '3-4',
          photoUrl: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetDashboard.mockResolvedValue({
      childId: 'child-1',
      childName: 'Test Child',
      ageBand: '3-4',
      overallScore: 0,
      dimensions: [],
      calculatedAt: '2024-01-01T00:00:00Z',
    });
    mockGetRecentObservations.mockResolvedValue({ data: [] });
    mockGetMilestonesDue.mockResolvedValue({ data: [] });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Dimensions')).toBeInTheDocument();
      // All 6 dimensions should be present
      expect(screen.getByText('Academic')).toBeInTheDocument();
      expect(screen.getByText('Social-Emotional')).toBeInTheDocument();
      expect(screen.getByText('Behavioural')).toBeInTheDocument();
      expect(screen.getByText('Aspirational')).toBeInTheDocument();
      expect(screen.getByText('Islamic')).toBeInTheDocument();
      expect(screen.getByText('Physical')).toBeInTheDocument();
    });
  });

  it('renders recent observations section', async () => {
    const mockObservation = {
      id: 'obs-1',
      childId: 'child-1',
      dimension: 'academic',
      content: 'Great reading progress',
      sentiment: 'positive',
      observedAt: '2024-01-01T00:00:00Z',
      tags: ['reading'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockGetChildren.mockResolvedValue({
      data: [
        {
          id: 'child-1',
          name: 'Test Child',
          dateOfBirth: '2020-01-01',
          gender: 'female' as const,
          ageBand: '3-4',
          photoUrl: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetDashboard.mockResolvedValue({
      childId: 'child-1',
      childName: 'Test Child',
      ageBand: '3-4',
      overallScore: 0,
      dimensions: [],
      calculatedAt: '2024-01-01T00:00:00Z',
    });
    mockGetRecentObservations.mockResolvedValue({ data: [mockObservation] });
    mockGetMilestonesDue.mockResolvedValue({ data: [] });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Recent Observations')).toBeInTheDocument();
      expect(screen.getByText('Great reading progress')).toBeInTheDocument();
    });
  });

  it('shows empty state when no observations exist', async () => {
    mockGetChildren.mockResolvedValue({
      data: [
        {
          id: 'child-1',
          name: 'Test Child',
          dateOfBirth: '2020-01-01',
          gender: 'female' as const,
          ageBand: '3-4',
          photoUrl: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetDashboard.mockResolvedValue({
      childId: 'child-1',
      childName: 'Test Child',
      ageBand: '3-4',
      overallScore: 0,
      dimensions: [],
      calculatedAt: '2024-01-01T00:00:00Z',
    });
    mockGetRecentObservations.mockResolvedValue({ data: [] });
    mockGetMilestonesDue.mockResolvedValue({ data: [] });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/No observations yet/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Log your first observation to start building/)
      ).toBeInTheDocument();
    });
  });

  it('renders floating action button for logging observations', async () => {
    mockGetChildren.mockResolvedValue({
      data: [
        {
          id: 'child-1',
          name: 'Test Child',
          dateOfBirth: '2020-01-01',
          gender: 'female' as const,
          ageBand: '3-4',
          photoUrl: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetDashboard.mockResolvedValue({
      childId: 'child-1',
      childName: 'Test Child',
      ageBand: '3-4',
      overallScore: 0,
      dimensions: [],
      calculatedAt: '2024-01-01T00:00:00Z',
    });
    mockGetRecentObservations.mockResolvedValue({ data: [] });
    mockGetMilestonesDue.mockResolvedValue({ data: [] });

    render(<DashboardPage />);

    await waitFor(() => {
      const fabButton = screen.getByLabelText(/Log new observation/i);
      expect(fabButton).toBeInTheDocument();
      expect(fabButton).toHaveAttribute('href', '/dashboard/observe');
    });
  });

  it('displays error state when API call fails', async () => {
    mockGetChildren.mockRejectedValue(new Error('Network error'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Error loading dashboard/i)).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows child selector when multiple children exist', async () => {
    mockGetChildren.mockResolvedValue({
      data: [
        {
          id: 'child-1',
          name: 'Sarah',
          dateOfBirth: '2020-01-01',
          gender: 'female' as const,
          ageBand: '3-4',
          photoUrl: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'child-2',
          name: 'Ahmed',
          dateOfBirth: '2018-06-15',
          gender: 'male' as const,
          ageBand: '5-6',
          photoUrl: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 50, total: 2, totalPages: 1, hasMore: false },
    });
    mockGetDashboard.mockResolvedValue({
      childId: 'child-1',
      childName: 'Sarah',
      ageBand: '3-4',
      overallScore: 0,
      dimensions: [],
      calculatedAt: '2024-01-01T00:00:00Z',
    });
    mockGetRecentObservations.mockResolvedValue({ data: [] });
    mockGetMilestonesDue.mockResolvedValue({ data: [] });

    render(<DashboardPage />);

    await waitFor(() => {
      const selector = screen.getByLabelText(/Select child/i);
      expect(selector).toBeInTheDocument();
      expect(selector).toHaveValue('child-1');
    });
  });
});
