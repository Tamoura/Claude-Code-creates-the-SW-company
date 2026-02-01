import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '../page';

vi.mock('@/lib/api', () => ({
  listInvoices: vi.fn(),
}));

import { listInvoices } from '@/lib/api';
const mockListInvoices = vi.mocked(listInvoices);

import { useRouter } from 'next/navigation';
const mockRouter = vi.mocked(useRouter);

describe('DashboardPage', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter.mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it('renders the dashboard heading', () => {
    mockListInvoices.mockResolvedValueOnce({
      invoices: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
      summary: { totalOutstanding: 0, paidThisMonth: 0, invoicesThisMonth: 0 },
    });

    render(<DashboardPage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText("Welcome back! Here's your overview.")
    ).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    mockListInvoices.mockImplementation(
      () => new Promise(() => {})
    );

    render(<DashboardPage />);
    const spinners = document.querySelectorAll('.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('displays summary stats after loading', async () => {
    mockListInvoices.mockResolvedValueOnce({
      invoices: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
      summary: { totalOutstanding: 150000, paidThisMonth: 50000, invoicesThisMonth: 3 },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('$1500.00')).toBeInTheDocument();
      expect(screen.getByText('$500.00')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('renders stat card labels', async () => {
    mockListInvoices.mockResolvedValueOnce({
      invoices: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
      summary: { totalOutstanding: 0, paidThisMonth: 0, invoicesThisMonth: 0 },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Outstanding')).toBeInTheDocument();
      expect(screen.getByText('Paid This Month')).toBeInTheDocument();
      expect(screen.getByText('Invoices This Month')).toBeInTheDocument();
    });
  });

  it('shows empty state when no invoices exist', async () => {
    mockListInvoices.mockResolvedValueOnce({
      invoices: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
      summary: { totalOutstanding: 0, paidThisMonth: 0, invoicesThisMonth: 0 },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('No invoices yet')).toBeInTheDocument();
      expect(screen.getByText('Create Your First Invoice')).toBeInTheDocument();
    });
  });

  it('renders recent invoices when data exists', async () => {
    mockListInvoices.mockResolvedValueOnce({
      invoices: [
        {
          id: '1',
          invoiceNumber: 'INV-001',
          status: 'draft' as const,
          client: { id: 'c1', name: 'Acme Corp', email: null, matched: false },
          items: [],
          subtotal: 10000,
          taxRate: 0,
          taxAmount: 0,
          total: 10000,
          currency: 'USD',
          invoiceDate: '2025-01-15',
          dueDate: '2025-02-15',
          notes: null,
          aiPrompt: null,
          shareToken: null,
          paymentLink: null,
          paidAt: null,
          sentAt: null,
          createdAt: '2025-01-15T00:00:00Z',
          updatedAt: '2025-01-15T00:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
      summary: { totalOutstanding: 10000, paidThisMonth: 0, invoicesThisMonth: 1 },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('DRAFT')).toBeInTheDocument();
      const amounts = screen.getAllByText('$100.00');
      expect(amounts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders New Invoice button link', () => {
    mockListInvoices.mockResolvedValueOnce({
      invoices: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
      summary: { totalOutstanding: 0, paidThisMonth: 0, invoicesThisMonth: 0 },
    });

    render(<DashboardPage />);
    const newInvoiceLinks = screen.getAllByRole('link', { name: /New Invoice/i });
    expect(newInvoiceLinks.length).toBeGreaterThanOrEqual(1);
    expect(newInvoiceLinks[0]).toHaveAttribute('href', '/dashboard/invoices/new');
  });

  it('renders Quick Actions section', async () => {
    mockListInvoices.mockResolvedValueOnce({
      invoices: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
      summary: { totalOutstanding: 0, paidThisMonth: 0, invoicesThisMonth: 0 },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Create New Invoice')).toBeInTheDocument();
      expect(screen.getByText('Manage Clients')).toBeInTheDocument();
    });
  });

  it('renders Getting Started section', async () => {
    mockListInvoices.mockResolvedValueOnce({
      invoices: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
      summary: { totalOutstanding: 0, paidThisMonth: 0, invoicesThisMonth: 0 },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(
        screen.getByText('Create your first invoice with AI')
      ).toBeInTheDocument();
    });
  });

  it('shows $0.00 when summary is null', async () => {
    mockListInvoices.mockResolvedValueOnce({
      invoices: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
      summary: { totalOutstanding: 0, paidThisMonth: 0, invoicesThisMonth: 0 },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      const zeroAmounts = screen.getAllByText('$0.00');
      expect(zeroAmounts.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('handles API error gracefully', async () => {
    mockListInvoices.mockRejectedValueOnce(new Error('Network error'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('displays View All link for invoices', async () => {
    mockListInvoices.mockResolvedValueOnce({
      invoices: [
        {
          id: '1',
          invoiceNumber: 'INV-001',
          status: 'draft' as const,
          client: null,
          items: [],
          subtotal: 0,
          taxRate: 0,
          taxAmount: 0,
          total: 0,
          currency: 'USD',
          invoiceDate: '2025-01-15',
          dueDate: '2025-02-15',
          notes: null,
          aiPrompt: null,
          shareToken: null,
          paymentLink: null,
          paidAt: null,
          sentAt: null,
          createdAt: '2025-01-15T00:00:00Z',
          updatedAt: '2025-01-15T00:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
      summary: { totalOutstanding: 0, paidThisMonth: 0, invoicesThisMonth: 0 },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      const viewAllLink = screen.getByRole('link', { name: 'View All' });
      expect(viewAllLink).toHaveAttribute('href', '/dashboard/invoices');
    });
  });

  it('shows "No client" for invoices without a client', async () => {
    mockListInvoices.mockResolvedValueOnce({
      invoices: [
        {
          id: '1',
          invoiceNumber: 'INV-001',
          status: 'draft' as const,
          client: null,
          items: [],
          subtotal: 0,
          taxRate: 0,
          taxAmount: 0,
          total: 0,
          currency: 'USD',
          invoiceDate: '2025-01-15',
          dueDate: '2025-02-15',
          notes: null,
          aiPrompt: null,
          shareToken: null,
          paymentLink: null,
          paidAt: null,
          sentAt: null,
          createdAt: '2025-01-15T00:00:00Z',
          updatedAt: '2025-01-15T00:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
      summary: { totalOutstanding: 0, paidThisMonth: 0, invoicesThisMonth: 0 },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('No client')).toBeInTheDocument();
    });
  });
});
