import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import PaymentsList from './PaymentsList';
import { useDashboardData } from '../../hooks/useDashboardData';
import type { TransactionRow } from '../../components/dashboard/TransactionsTable';

// Mock the hook
vi.mock('../../hooks/useDashboardData');

const mockTransactions: TransactionRow[] = [
  {
    id: '#TX-8821',
    customer: '0x4a...9f21',
    date: 'Oct 24, 2023',
    amount: '$50.00',
    asset: 'USDC',
    status: 'SUCCESS',
  },
  {
    id: '#TX-8820',
    customer: 'alice@crypto.io',
    date: 'Oct 23, 2023',
    amount: '$1,200.00',
    asset: 'DAI',
    status: 'PENDING',
  },
  {
    id: '#TX-8819',
    customer: 'Bob Smith',
    date: 'Oct 23, 2023',
    amount: '$15.00',
    asset: 'USDT',
    status: 'FAILED',
  },
];

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('PaymentsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDashboardData).mockReturnValue({
      isLoading: false,
      transactions: mockTransactions,
      stats: {
        totalBalance: { title: 'Total Balance', value: '$1,265.00' },
        settlementVolume: { title: 'Settlement Volume', value: '$1,265.00' },
        successRate: { title: 'Success Rate', value: '66.7%' },
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Search functionality', () => {
    it('renders search input with placeholder', () => {
      renderWithRouter(<PaymentsList />);

      const searchInput = screen.getByPlaceholderText(/search by description or tx hash/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('filters transactions by ID', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PaymentsList />);

      const searchInput = screen.getByPlaceholderText(/search by description or tx hash/i);
      await user.type(searchInput, '8821');

      expect(screen.getByText('#TX-8821')).toBeInTheDocument();
      expect(screen.queryByText('#TX-8820')).not.toBeInTheDocument();
      expect(screen.queryByText('#TX-8819')).not.toBeInTheDocument();
    });

    it('filters transactions by customer name (case-insensitive)', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PaymentsList />);

      const searchInput = screen.getByPlaceholderText(/search by description or tx hash/i);
      await user.type(searchInput, 'alice');

      expect(screen.queryByText('#TX-8821')).not.toBeInTheDocument();
      expect(screen.getByText('#TX-8820')).toBeInTheDocument();
      expect(screen.queryByText('#TX-8819')).not.toBeInTheDocument();
    });

    it('filters transactions by amount', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PaymentsList />);

      const searchInput = screen.getByPlaceholderText(/search by description or tx hash/i);
      await user.type(searchInput, '1,200');

      expect(screen.queryByText('#TX-8821')).not.toBeInTheDocument();
      expect(screen.getByText('#TX-8820')).toBeInTheDocument();
      expect(screen.queryByText('#TX-8819')).not.toBeInTheDocument();
    });
  });

  describe('CSV Export functionality', () => {
    it('renders Export CSV button', () => {
      renderWithRouter(<PaymentsList />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      expect(exportButton).toBeInTheDocument();
    });

    it('triggers CSV download when clicked', async () => {
      const user = userEvent.setup();

      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      const mockClick = vi.fn();

      const originalCreateObjectURL = global.URL.createObjectURL;
      const originalRevokeObjectURL = global.URL.revokeObjectURL;

      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Spy on createElement to capture anchor element
      let capturedAnchor: HTMLAnchorElement | null = null;
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const element = originalCreateElement(tag);
        if (tag === 'a') {
          capturedAnchor = element as HTMLAnchorElement;
          element.click = mockClick;
        }
        return element;
      });

      renderWithRouter(<PaymentsList />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(exportButton);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(capturedAnchor?.download).toMatch(/stableflow-payments-\d{4}-\d{2}-\d{2}\.csv/);

      // Cleanup
      global.URL.createObjectURL = originalCreateObjectURL;
      global.URL.revokeObjectURL = originalRevokeObjectURL;
      createElementSpy.mockRestore();
    });

    it('exports CSV with correct headers and data', async () => {
      const user = userEvent.setup();

      let capturedBlob: Blob | null = null;
      const originalCreateObjectURL = global.URL.createObjectURL;
      const originalRevokeObjectURL = global.URL.revokeObjectURL;
      const mockClick = vi.fn();

      global.URL.createObjectURL = vi.fn((blob: Blob) => {
        capturedBlob = blob;
        return 'blob:mock-url';
      });
      global.URL.revokeObjectURL = vi.fn();

      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const element = originalCreateElement(tag);
        if (tag === 'a') {
          element.click = mockClick;
        }
        return element;
      });

      renderWithRouter(<PaymentsList />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(exportButton);

      expect(capturedBlob).not.toBeNull();

      if (capturedBlob) {
        // Use FileReader to read the Blob (compatible with jsdom)
        const csvText = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsText(capturedBlob as Blob);
        });

        expect(csvText).toContain('ID,Customer,Date,Amount,Asset,Status');
        // Dates with commas should be properly escaped with quotes
        expect(csvText).toContain('#TX-8821,0x4a...9f21,"Oct 24, 2023",$50.00,USDC,SUCCESS');
      }

      // Cleanup
      global.URL.createObjectURL = originalCreateObjectURL;
      global.URL.revokeObjectURL = originalRevokeObjectURL;
      createElementSpy.mockRestore();
    });
  });

  describe('Combined filtering', () => {
    it('applies both search and status filter together', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PaymentsList />);

      // First filter by status
      const completedButton = screen.getByRole('button', { name: /completed/i });
      await user.click(completedButton);

      // Then apply search
      const searchInput = screen.getByPlaceholderText(/search by description or tx hash/i);
      await user.type(searchInput, '8821');

      // Should show the SUCCESS transaction that matches search
      expect(screen.getByText('#TX-8821')).toBeInTheDocument();
      expect(screen.queryByText('#TX-8820')).not.toBeInTheDocument();
      expect(screen.queryByText('#TX-8819')).not.toBeInTheDocument();
    });

    it('shows no results when search and filter have no matches', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PaymentsList />);

      // Filter by Failed
      const failedButton = screen.getByRole('button', { name: /failed/i });
      await user.click(failedButton);

      // Search for a SUCCESS transaction ID
      const searchInput = screen.getByPlaceholderText(/search by description or tx hash/i);
      await user.type(searchInput, '8821');

      // Should show no results
      expect(screen.queryByText('#TX-8821')).not.toBeInTheDocument();
      expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
    });
  });

  describe('Results count', () => {
    it('displays result count for all transactions', () => {
      renderWithRouter(<PaymentsList />);

      expect(screen.getByText(/showing 3 of 3 payments/i)).toBeInTheDocument();
    });

    it('updates count when filtering by status', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PaymentsList />);

      const failedButton = screen.getByRole('button', { name: /failed/i });
      await user.click(failedButton);

      expect(screen.getByText(/showing 1 of 3 payments/i)).toBeInTheDocument();
    });

    it('updates count when searching', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PaymentsList />);

      const searchInput = screen.getByPlaceholderText(/search by description or tx hash/i);
      await user.type(searchInput, 'alice');

      expect(screen.getByText(/showing 1 of 3 payments/i)).toBeInTheDocument();
    });

    it('updates count when combining search and filter', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PaymentsList />);

      // Filter by Completed (1 SUCCESS transaction)
      const completedButton = screen.getByRole('button', { name: /completed/i });
      await user.click(completedButton);

      // Search for specific ID
      const searchInput = screen.getByPlaceholderText(/search by description or tx hash/i);
      await user.type(searchInput, '8821');

      expect(screen.getByText(/showing 1 of 3 payments/i)).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('shows loading state while data is being fetched', () => {
      // Use a fresh mock for this test
      vi.resetAllMocks();
      vi.mocked(useDashboardData).mockReturnValue({
        isLoading: true,
        transactions: [],
        stats: {
          totalBalance: { title: 'Total Balance', value: '$0.00' },
          settlementVolume: { title: 'Settlement Volume', value: '$0.00' },
          successRate: { title: 'Success Rate', value: '0%' },
        },
      });

      renderWithRouter(<PaymentsList />);

      expect(screen.getByText(/loading transactions/i)).toBeInTheDocument();
    });
  });
});
