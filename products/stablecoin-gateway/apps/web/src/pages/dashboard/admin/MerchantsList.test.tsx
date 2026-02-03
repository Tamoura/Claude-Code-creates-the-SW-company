import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MerchantsList from './MerchantsList';
import * as useAdminMerchantsModule from '../../../hooks/useAdminMerchants';

// Mock the useAdminMerchants hook
vi.mock('../../../hooks/useAdminMerchants');

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('MerchantsList Page', () => {
  const mockMerchants = [
    {
      id: 'merch_1',
      email: 'merchant1@example.com',
      created_at: '2024-01-15T10:00:00Z',
      payment_count: 45,
      total_volume: 125000,
      status_summary: {
        COMPLETED: 40,
        PENDING: 3,
        FAILED: 2,
      },
    },
    {
      id: 'merch_2',
      email: 'merchant2@example.com',
      created_at: '2024-01-20T14:30:00Z',
      payment_count: 12,
      total_volume: 35000,
      status_summary: {
        COMPLETED: 10,
        FAILED: 1,
        REFUNDED: 1,
      },
    },
    {
      id: 'merch_3',
      email: 'newmerchant@example.com',
      created_at: '2024-02-01T08:00:00Z',
      payment_count: 0,
      total_volume: 0,
      status_summary: {},
    },
  ];

  const mockSetSearch = vi.fn();
  const mockSetPage = vi.fn();
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    vi.spyOn(useAdminMerchantsModule, 'useAdminMerchants').mockReturnValue({
      merchants: mockMerchants,
      isLoading: false,
      error: null,
      total: 3,
      hasMore: false,
      search: '',
      setSearch: mockSetSearch,
      page: 0,
      setPage: mockSetPage,
      refresh: mockRefresh,
    });
  });

  describe('Rendering', () => {
    it('renders page title and merchant count', () => {
      renderWithRouter(<MerchantsList />);

      expect(screen.getByText('All Merchants')).toBeInTheDocument();
      expect(screen.getByText('3 total merchants')).toBeInTheDocument();
    });

    it('renders search input', () => {
      renderWithRouter(<MerchantsList />);

      expect(screen.getByPlaceholderText(/search by email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    it('renders merchants table', () => {
      renderWithRouter(<MerchantsList />);

      expect(screen.getByText('merchant1@example.com')).toBeInTheDocument();
      expect(screen.getByText('merchant2@example.com')).toBeInTheDocument();
      expect(screen.getByText('newmerchant@example.com')).toBeInTheDocument();
    });

    it('displays payment counts', () => {
      renderWithRouter(<MerchantsList />);

      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('displays formatted volumes', () => {
      renderWithRouter(<MerchantsList />);

      expect(screen.getByText('$125,000.00')).toBeInTheDocument();
      expect(screen.getByText('$35,000.00')).toBeInTheDocument();
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    it('displays formatted dates', () => {
      renderWithRouter(<MerchantsList />);

      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 20, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Feb 1, 2024/)).toBeInTheDocument();
    });

    it('renders status badges', () => {
      renderWithRouter(<MerchantsList />);

      expect(screen.getByText(/40 completed/i)).toBeInTheDocument();
      expect(screen.getByText(/3 pending/i)).toBeInTheDocument();
      expect(screen.getByText(/2 failed/i)).toBeInTheDocument();
    });

    it('renders view links for each merchant', () => {
      renderWithRouter(<MerchantsList />);

      const viewLinks = screen.getAllByRole('link', { name: /view/i });
      expect(viewLinks).toHaveLength(3);
      expect(viewLinks[0]).toHaveAttribute('href', '/dashboard/admin/merchants/merch_1/payments');
      expect(viewLinks[1]).toHaveAttribute('href', '/dashboard/admin/merchants/merch_2/payments');
    });
  });

  describe('Loading State', () => {
    it('shows loading state', () => {
      vi.spyOn(useAdminMerchantsModule, 'useAdminMerchants').mockReturnValue({
        merchants: [],
        isLoading: true,
        error: null,
        total: 0,
        hasMore: false,
        search: '',
        setSearch: mockSetSearch,
        page: 0,
        setPage: mockSetPage,
        refresh: mockRefresh,
      });

      renderWithRouter(<MerchantsList />);

      expect(screen.getByText(/loading merchants/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no merchants exist', () => {
      vi.spyOn(useAdminMerchantsModule, 'useAdminMerchants').mockReturnValue({
        merchants: [],
        isLoading: false,
        error: null,
        total: 0,
        hasMore: false,
        search: '',
        setSearch: mockSetSearch,
        page: 0,
        setPage: mockSetPage,
        refresh: mockRefresh,
      });

      renderWithRouter(<MerchantsList />);

      expect(screen.getByText(/no merchants found/i)).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when error occurs', () => {
      vi.spyOn(useAdminMerchantsModule, 'useAdminMerchants').mockReturnValue({
        merchants: [],
        isLoading: false,
        error: 'Failed to load merchants',
        total: 0,
        hasMore: false,
        search: '',
        setSearch: mockSetSearch,
        page: 0,
        setPage: mockSetPage,
        refresh: mockRefresh,
      });

      renderWithRouter(<MerchantsList />);

      expect(screen.getByText('Failed to load merchants')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('updates search input value', () => {
      renderWithRouter(<MerchantsList />);

      const searchInput = screen.getByPlaceholderText(/search by email/i);
      fireEvent.change(searchInput, { target: { value: 'test@example.com' } });

      expect(searchInput).toHaveValue('test@example.com');
    });

    it('submits search when search button is clicked', async () => {
      renderWithRouter(<MerchantsList />);

      const searchInput = screen.getByPlaceholderText(/search by email/i);
      fireEvent.change(searchInput, { target: { value: 'merchant1' } });

      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockSetSearch).toHaveBeenCalledWith('merchant1');
      });
    });

    it('resets page to 0 when searching', async () => {
      renderWithRouter(<MerchantsList />);

      const searchInput = screen.getByPlaceholderText(/search by email/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockSetPage).toHaveBeenCalledWith(0);
      });
    });

    it('submits search on form submit', async () => {
      renderWithRouter(<MerchantsList />);

      const searchInput = screen.getByPlaceholderText(/search by email/i);
      const form = searchInput.closest('form');

      fireEvent.change(searchInput, { target: { value: 'merchant2' } });
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockSetSearch).toHaveBeenCalledWith('merchant2');
      });
    });
  });

  describe('Pagination', () => {
    it('renders pagination controls', () => {
      renderWithRouter(<MerchantsList />);

      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      expect(screen.getByText(/showing 3 of 3/i)).toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
      renderWithRouter(<MerchantsList />);

      const previousButton = screen.getByRole('button', { name: /previous/i });
      expect(previousButton).toBeDisabled();
    });

    it('enables previous button when not on first page', () => {
      vi.spyOn(useAdminMerchantsModule, 'useAdminMerchants').mockReturnValue({
        merchants: mockMerchants,
        isLoading: false,
        error: null,
        total: 40,
        hasMore: true,
        search: '',
        setSearch: mockSetSearch,
        page: 1,
        setPage: mockSetPage,
        refresh: mockRefresh,
      });

      renderWithRouter(<MerchantsList />);

      const previousButton = screen.getByRole('button', { name: /previous/i });
      expect(previousButton).not.toBeDisabled();
    });

    it('disables next button when no more pages', () => {
      renderWithRouter(<MerchantsList />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('enables next button when more pages exist', () => {
      vi.spyOn(useAdminMerchantsModule, 'useAdminMerchants').mockReturnValue({
        merchants: mockMerchants,
        isLoading: false,
        error: null,
        total: 40,
        hasMore: true,
        search: '',
        setSearch: mockSetSearch,
        page: 0,
        setPage: mockSetPage,
        refresh: mockRefresh,
      });

      renderWithRouter(<MerchantsList />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();
    });

    it('calls setPage with incremented value on next click', () => {
      vi.spyOn(useAdminMerchantsModule, 'useAdminMerchants').mockReturnValue({
        merchants: mockMerchants,
        isLoading: false,
        error: null,
        total: 40,
        hasMore: true,
        search: '',
        setSearch: mockSetSearch,
        page: 0,
        setPage: mockSetPage,
        refresh: mockRefresh,
      });

      renderWithRouter(<MerchantsList />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      expect(mockSetPage).toHaveBeenCalledWith(1);
    });

    it('calls setPage with decremented value on previous click', () => {
      vi.spyOn(useAdminMerchantsModule, 'useAdminMerchants').mockReturnValue({
        merchants: mockMerchants,
        isLoading: false,
        error: null,
        total: 40,
        hasMore: true,
        search: '',
        setSearch: mockSetSearch,
        page: 2,
        setPage: mockSetPage,
        refresh: mockRefresh,
      });

      renderWithRouter(<MerchantsList />);

      const previousButton = screen.getByRole('button', { name: /previous/i });
      fireEvent.click(previousButton);

      expect(mockSetPage).toHaveBeenCalledWith(1);
    });
  });
});
