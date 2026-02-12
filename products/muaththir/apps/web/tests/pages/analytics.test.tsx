import { render, screen, waitFor } from '@testing-library/react';
import AnalyticsPage from '../../src/app/dashboard/analytics/page';

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
  usePathname: () => '/dashboard/analytics',
}));

// Mock API client
jest.mock('../../src/lib/api-client', () => ({
  apiClient: {
    getChildren: jest.fn(),
    getObservations: jest.fn(),
  },
}));

import { apiClient } from '../../src/lib/api-client';
const mockGetChildren = apiClient.getChildren as jest.Mock;
const mockGetObservations = (apiClient as any).getObservations as jest.Mock;

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

const mockObservations = [
  {
    id: 'obs-1', childId: 'child-1', dimension: 'academic',
    content: 'Great reading', sentiment: 'positive',
    observedAt: '2024-01-15T10:00:00Z', tags: ['reading'],
    createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'obs-2', childId: 'child-1', dimension: 'academic',
    content: 'Math improvement', sentiment: 'positive',
    observedAt: '2024-01-14T10:00:00Z', tags: ['math'],
    createdAt: '2024-01-14T10:00:00Z', updatedAt: '2024-01-14T10:00:00Z',
  },
  {
    id: 'obs-3', childId: 'child-1', dimension: 'islamic',
    content: 'Quran memorization', sentiment: 'positive',
    observedAt: '2024-01-13T10:00:00Z', tags: ['quran'],
    createdAt: '2024-01-13T10:00:00Z', updatedAt: '2024-01-13T10:00:00Z',
  },
  {
    id: 'obs-4', childId: 'child-1', dimension: 'physical',
    content: 'Swimming lesson', sentiment: 'neutral',
    observedAt: '2024-01-12T10:00:00Z', tags: ['swimming'],
    createdAt: '2024-01-12T10:00:00Z', updatedAt: '2024-01-12T10:00:00Z',
  },
  {
    id: 'obs-5', childId: 'child-1', dimension: 'behavioural',
    content: 'Shared toys', sentiment: 'positive',
    observedAt: '2024-01-11T10:00:00Z', tags: [],
    createdAt: '2024-01-11T10:00:00Z', updatedAt: '2024-01-11T10:00:00Z',
  },
];

describe('AnalyticsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetChildren.mockResolvedValue({
      data: [mockChild],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetObservations.mockResolvedValue({
      data: mockObservations,
      pagination: { page: 1, limit: 200, total: 5, totalPages: 1, hasMore: false },
    });
  });

  it('renders the analytics page title', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Observation Analytics')).toBeInTheDocument();
    });
  });

  it('shows observation count per dimension section', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Observations by Dimension')).toBeInTheDocument();
    });
  });

  it('renders bar chart elements for dimensions with observations', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      // Academic has 2 observations - should have a bar
      const bars = screen.getAllByTestId(/analytics-bar-/);
      expect(bars.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows most active dimension', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Most Active Dimension')).toBeInTheDocument();
      // Academic has the most (2 observations)
      expect(screen.getByTestId('most-active-dimension')).toHaveTextContent('Academic');
    });
  });

  it('shows total observation count', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Observations')).toBeInTheDocument();
      expect(screen.getByTestId('total-observations-count')).toHaveTextContent('5');
    });
  });

  it('shows empty state when no observations exist', async () => {
    mockGetObservations.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 200, total: 0, totalPages: 0, hasMore: false },
    });

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No observations yet/i)).toBeInTheDocument();
    });
  });

  it('shows no children state when user has no children', async () => {
    mockGetChildren.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false },
    });

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Add Your First Child/i)).toBeInTheDocument();
    });
  });
});
