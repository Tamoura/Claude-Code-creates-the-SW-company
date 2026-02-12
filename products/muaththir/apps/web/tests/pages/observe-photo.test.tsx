import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ObservePage from '../../src/app/dashboard/observe/page';

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
  usePathname: () => '/dashboard/observe',
}));

// Mock API client
jest.mock('../../src/lib/api-client', () => ({
  apiClient: {
    getChildren: jest.fn(),
    createObservation: jest.fn(),
  },
}));

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

import { apiClient } from '../../src/lib/api-client';
const mockGetChildren = apiClient.getChildren as jest.Mock;

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

describe('ObservePage - Photo Attachment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetChildren.mockResolvedValue({
      data: [mockChild],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
  });

  it('renders the photo upload button', async () => {
    render(<ObservePage />);

    await waitFor(() => {
      expect(screen.getByText('Attach Photo')).toBeInTheDocument();
    });
  });

  it('shows camera icon in the upload button', async () => {
    render(<ObservePage />);

    await waitFor(() => {
      expect(screen.getByText('Attach Photo')).toBeInTheDocument();
    });

    const button = screen.getByText('Attach Photo');
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows image preview after selecting a file', async () => {
    render(<ObservePage />);

    await waitFor(() => {
      expect(screen.getByText('Attach Photo')).toBeInTheDocument();
    });

    const fileInput = screen.getByTestId('photo-input');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('photo-preview')).toBeInTheDocument();
    });
  });

  it('shows the remove button when photo is selected', async () => {
    render(<ObservePage />);

    await waitFor(() => {
      expect(screen.getByText('Attach Photo')).toBeInTheDocument();
    });

    const fileInput = screen.getByTestId('photo-input');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Remove photo')).toBeInTheDocument();
    });
  });

  it('removes photo preview when remove button is clicked', async () => {
    render(<ObservePage />);

    await waitFor(() => {
      expect(screen.getByText('Attach Photo')).toBeInTheDocument();
    });

    const fileInput = screen.getByTestId('photo-input');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('photo-preview')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Remove photo'));

    await waitFor(() => {
      expect(screen.queryByTestId('photo-preview')).not.toBeInTheDocument();
      expect(screen.getByText('Attach Photo')).toBeInTheDocument();
    });
  });

  it('rejects files larger than 5MB', async () => {
    render(<ObservePage />);

    await waitFor(() => {
      expect(screen.getByText('Attach Photo')).toBeInTheDocument();
    });

    const fileInput = screen.getByTestId('photo-input');
    const file = new File(['test'], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/under 5MB/i)).toBeInTheDocument();
    });
  });
});
