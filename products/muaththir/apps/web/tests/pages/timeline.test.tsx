import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TimelinePage from '../../src/app/dashboard/timeline/page';

jest.setTimeout(15000);
jest.retryTimes(2, { logErrorsBeforeRetry: true });

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
  usePathname: () => '/dashboard/timeline',
}));

// Mock API client
jest.mock('../../src/lib/api-client', () => ({
  apiClient: {
    getChildren: jest.fn(),
    getObservations: jest.fn(),
    deleteObservation: jest.fn(),
    exportData: jest.fn(),
  },
}));

import { apiClient } from '../../src/lib/api-client';
const mockGetChildren = apiClient.getChildren as jest.Mock;
const mockGetObservations = apiClient.getObservations as jest.Mock;
const mockExportData = apiClient.exportData as jest.Mock;

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:http://localhost/fake-url');
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe('TimelinePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockGetChildren.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<TimelinePage />);

    // Should show the loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows child selector when multiple children exist', async () => {
    mockGetChildren.mockResolvedValue({
      data: [
        { id: 'child-1', name: 'Sarah', dateOfBirth: '2020-01-01', gender: 'female', ageBand: '3-4', photoUrl: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
        { id: 'child-2', name: 'Ahmed', dateOfBirth: '2018-06-15', gender: 'male', ageBand: '5-6', photoUrl: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      ],
      pagination: { page: 1, limit: 50, total: 2, totalPages: 1, hasMore: false },
    });

    render(<TimelinePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Select child/i)).toBeInTheDocument();
    });
  });

  it('renders observations when a child is selected', async () => {
    const mockObs = {
      id: 'obs-1',
      childId: 'child-1',
      dimension: 'academic',
      content: 'Read a whole chapter by herself',
      sentiment: 'positive',
      observedAt: '2026-02-10T10:00:00Z',
      tags: ['reading'],
      createdAt: '2026-02-10T10:00:00Z',
      updatedAt: '2026-02-10T10:00:00Z',
    };

    mockGetChildren.mockResolvedValue({
      data: [
        { id: 'child-1', name: 'Sarah', dateOfBirth: '2020-01-01', gender: 'female', ageBand: '3-4', photoUrl: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetObservations.mockResolvedValue({
      data: [mockObs],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false },
    });

    render(<TimelinePage />);

    await waitFor(() => {
      expect(screen.getByText('Read a whole chapter by herself')).toBeInTheDocument();
    });
  });

  it('shows empty state when no observations exist', async () => {
    mockGetChildren.mockResolvedValue({
      data: [
        { id: 'child-1', name: 'Sarah', dateOfBirth: '2020-01-01', gender: 'female', ageBand: '3-4', photoUrl: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetObservations.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false },
    });

    render(<TimelinePage />);

    await waitFor(() => {
      expect(screen.getByText(/No observations yet/i)).toBeInTheDocument();
    });
  });

  it('renders export CSV button when a child is selected', async () => {
    mockGetChildren.mockResolvedValue({
      data: [
        { id: 'child-1', name: 'Sarah', dateOfBirth: '2020-01-01', gender: 'female', ageBand: '3-4', photoUrl: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetObservations.mockResolvedValue({
      data: [
        {
          id: 'obs-1', childId: 'child-1', dimension: 'academic',
          content: 'Test observation', sentiment: 'positive',
          observedAt: '2026-02-10T10:00:00Z', tags: [],
          createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-02-10T10:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false },
    });

    render(<TimelinePage />);

    await waitFor(() => {
      const exportBtn = screen.getByRole('button', { name: /export csv/i });
      expect(exportBtn).toBeInTheDocument();
    });
  });

  it('triggers CSV download when export button is clicked', async () => {
    const mockBlob = new Blob(['col1,col2\nval1,val2'], { type: 'text/csv' });
    mockExportData.mockResolvedValue(mockBlob);

    mockGetChildren.mockResolvedValue({
      data: [
        { id: 'child-1', name: 'Sarah', dateOfBirth: '2020-01-01', gender: 'female', ageBand: '3-4', photoUrl: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetObservations.mockResolvedValue({
      data: [
        {
          id: 'obs-1', childId: 'child-1', dimension: 'academic',
          content: 'Test observation', sentiment: 'positive',
          observedAt: '2026-02-10T10:00:00Z', tags: [],
          createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-02-10T10:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false },
    });

    render(<TimelinePage />);

    // Wait for the export button to become visible (after loading state resolves)
    const exportBtn = await screen.findByRole('button', { name: /export csv/i }, { timeout: 5000 });
    expect(exportBtn).toBeInTheDocument();

    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(mockExportData).toHaveBeenCalledWith('csv');
    });
  });

  it('shows filter buttons for dimensions', async () => {
    mockGetChildren.mockResolvedValue({
      data: [
        { id: 'child-1', name: 'Sarah', dateOfBirth: '2020-01-01', gender: 'female', ageBand: '3-4', photoUrl: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    mockGetObservations.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false },
    });

    render(<TimelinePage />);

    await waitFor(() => {
      expect(screen.getByText('All Dimensions')).toBeInTheDocument();
      expect(screen.getByText('Academic')).toBeInTheDocument();
    });
  });

  describe('Observation Search', () => {
    const mockObservations = [
      {
        id: 'obs-1', childId: 'child-1', dimension: 'academic',
        content: 'Read a whole chapter by herself',
        sentiment: 'positive', observedAt: '2026-02-10T10:00:00Z',
        tags: ['reading'], createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-02-10T10:00:00Z',
      },
      {
        id: 'obs-2', childId: 'child-1', dimension: 'islamic',
        content: 'Memorized Surah Al-Fatiha completely',
        sentiment: 'positive', observedAt: '2026-02-09T10:00:00Z',
        tags: ['quran'], createdAt: '2026-02-09T10:00:00Z', updatedAt: '2026-02-09T10:00:00Z',
      },
      {
        id: 'obs-3', childId: 'child-1', dimension: 'behavioural',
        content: 'Shared toys with younger sibling without being asked',
        sentiment: 'positive', observedAt: '2026-02-08T10:00:00Z',
        tags: ['sharing'], createdAt: '2026-02-08T10:00:00Z', updatedAt: '2026-02-08T10:00:00Z',
      },
    ];

    beforeEach(() => {
      mockGetChildren.mockResolvedValue({
        data: [
          { id: 'child-1', name: 'Sarah', dateOfBirth: '2020-01-01', gender: 'female', ageBand: '3-4', photoUrl: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
        ],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
      });
      mockGetObservations.mockResolvedValue({
        data: mockObservations,
        pagination: { page: 1, limit: 20, total: 3, totalPages: 1, hasMore: false },
      });
    });

    it('renders a search input', async () => {
      render(<TimelinePage />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search observations/i);
        expect(searchInput).toBeInTheDocument();
      });
    });

    it('filters observations by keyword', async () => {
      render(<TimelinePage />);

      await waitFor(() => {
        expect(screen.getByText('Read a whole chapter by herself')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search observations/i);
      fireEvent.change(searchInput, { target: { value: 'Surah' } });

      await waitFor(() => {
        expect(screen.getByText('Memorized Surah Al-Fatiha completely')).toBeInTheDocument();
        expect(screen.queryByText('Read a whole chapter by herself')).not.toBeInTheDocument();
        expect(screen.queryByText('Shared toys with younger sibling without being asked')).not.toBeInTheDocument();
      });
    });

    it('shows all observations when search is cleared', async () => {
      render(<TimelinePage />);

      await waitFor(() => {
        expect(screen.getByText('Read a whole chapter by herself')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search observations/i);
      fireEvent.change(searchInput, { target: { value: 'Surah' } });

      await waitFor(() => {
        expect(screen.queryByText('Read a whole chapter by herself')).not.toBeInTheDocument();
      });

      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByText('Read a whole chapter by herself')).toBeInTheDocument();
        expect(screen.getByText('Memorized Surah Al-Fatiha completely')).toBeInTheDocument();
        expect(screen.getByText('Shared toys with younger sibling without being asked')).toBeInTheDocument();
      });
    });

    it('search is case-insensitive', async () => {
      render(<TimelinePage />);

      await waitFor(() => {
        expect(screen.getByText('Read a whole chapter by herself')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search observations/i);
      fireEvent.change(searchInput, { target: { value: 'shared toys' } });

      await waitFor(() => {
        expect(screen.getByText('Shared toys with younger sibling without being asked')).toBeInTheDocument();
        expect(screen.queryByText('Read a whole chapter by herself')).not.toBeInTheDocument();
      });
    });
  });
});
