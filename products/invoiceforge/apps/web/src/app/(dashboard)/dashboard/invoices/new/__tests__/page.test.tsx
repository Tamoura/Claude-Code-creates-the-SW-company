import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewInvoicePage from '../page';

vi.mock('@/lib/api', () => ({
  generateInvoice: vi.fn(),
}));

import { generateInvoice } from '@/lib/api';
const mockGenerateInvoice = vi.mocked(generateInvoice);

import { useRouter } from 'next/navigation';
const mockRouter = vi.mocked(useRouter);

const mockInvoice = {
  id: 'inv-1',
  invoiceNumber: 'INV-001',
  status: 'draft' as const,
  client: {
    id: 'c1',
    name: 'Acme Corp',
    email: 'acme@test.com',
    matched: true,
  },
  items: [
    {
      id: 'item-1',
      description: 'Web Development',
      quantity: 40,
      unitPrice: 12500,
      amount: 500000,
      sortOrder: 0,
    },
  ],
  subtotal: 500000,
  taxRate: 850,
  taxAmount: 42500,
  total: 542500,
  currency: 'USD',
  invoiceDate: '2025-01-15T00:00:00Z',
  dueDate: '2025-01-29T00:00:00Z',
  notes: 'Net 14 payment terms',
  aiPrompt: 'Test prompt',
  shareToken: null,
  paymentLink: null,
  paidAt: null,
  sentAt: null,
  createdAt: '2025-01-15T00:00:00Z',
  updatedAt: '2025-01-15T00:00:00Z',
};

describe('NewInvoicePage', () => {
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

  describe('Input State (prompt form)', () => {
    it('renders the prompt heading', () => {
      render(<NewInvoicePage />);
      expect(screen.getByText('Describe your work')).toBeInTheDocument();
    });

    it('renders AI description text', () => {
      render(<NewInvoicePage />);
      expect(
        screen.getByText(/Type what you did, who it's for, and how much to charge/i)
      ).toBeInTheDocument();
    });

    it('renders textarea with placeholder', () => {
      render(<NewInvoicePage />);
      expect(
        screen.getByPlaceholderText(/I did 40 hours of web development/i)
      ).toBeInTheDocument();
    });

    it('shows character count', () => {
      render(<NewInvoicePage />);
      expect(screen.getByText('0/2000')).toBeInTheDocument();
    });

    it('updates character count as user types', async () => {
      const user = userEvent.setup();
      render(<NewInvoicePage />);

      const textarea = screen.getByPlaceholderText(
        /I did 40 hours of web development/i
      );
      await user.type(textarea, 'Hello world');

      expect(screen.getByText('11/2000')).toBeInTheDocument();
    });

    it('disables Generate button when prompt is too short', () => {
      render(<NewInvoicePage />);
      const button = screen.getByRole('button', { name: /Generate Invoice/i });
      expect(button).toBeDisabled();
    });

    it('shows minimum length hint for short prompts', async () => {
      const user = userEvent.setup();
      render(<NewInvoicePage />);

      const textarea = screen.getByPlaceholderText(
        /I did 40 hours of web development/i
      );
      await user.type(textarea, 'short');

      expect(
        screen.getByText('At least 10 characters required')
      ).toBeInTheDocument();
    });

    it('enables Generate button when prompt is 10+ characters', async () => {
      const user = userEvent.setup();
      render(<NewInvoicePage />);

      const textarea = screen.getByPlaceholderText(
        /I did 40 hours of web development/i
      );
      await user.type(textarea, 'This is a long enough prompt');

      const button = screen.getByRole('button', { name: /Generate Invoice/i });
      expect(button).not.toBeDisabled();
    });

    it('shows loading state while generating', async () => {
      const user = userEvent.setup();
      mockGenerateInvoice.mockImplementation(
        () => new Promise(() => {})
      );

      render(<NewInvoicePage />);

      const textarea = screen.getByPlaceholderText(
        /I did 40 hours of web development/i
      );
      await user.type(textarea, 'A long enough prompt for testing');
      await user.click(screen.getByRole('button', { name: /Generate Invoice/i }));

      expect(
        screen.getByText('Generating your invoice...')
      ).toBeInTheDocument();
    });

    it('displays error when generation fails', async () => {
      const user = userEvent.setup();
      mockGenerateInvoice.mockRejectedValueOnce(
        new Error('AI service unavailable')
      );

      render(<NewInvoicePage />);

      const textarea = screen.getByPlaceholderText(
        /I did 40 hours of web development/i
      );
      await user.type(textarea, 'A long enough prompt for testing');
      await user.click(screen.getByRole('button', { name: /Generate Invoice/i }));

      await waitFor(() => {
        expect(screen.getByText('AI service unavailable')).toBeInTheDocument();
      });
    });

    it('renders the tip text', () => {
      render(<NewInvoicePage />);
      expect(
        screen.getByText(/Tip: Be specific about hours, rates/i)
      ).toBeInTheDocument();
    });

    it('has maxLength of 2000 on textarea', () => {
      render(<NewInvoicePage />);
      const textarea = screen.getByPlaceholderText(
        /I did 40 hours of web development/i
      );
      expect(textarea).toHaveAttribute('maxLength', '2000');
    });
  });

  describe('Preview State (after generation)', () => {
    async function generateAndPreview() {
      const user = userEvent.setup();
      mockGenerateInvoice.mockResolvedValueOnce(mockInvoice);

      render(<NewInvoicePage />);

      const textarea = screen.getByPlaceholderText(
        /I did 40 hours of web development/i
      );
      await user.type(textarea, 'A long enough prompt for testing');
      await user.click(screen.getByRole('button', { name: /Generate Invoice/i }));

      await waitFor(() => {
        expect(screen.getByText('Invoice Preview')).toBeInTheDocument();
      });

      return user;
    }

    it('shows invoice preview after successful generation', async () => {
      await generateAndPreview();

      expect(screen.getByText(/INV-001/)).toBeInTheDocument();
      expect(screen.getByText('DRAFT')).toBeInTheDocument();
    });

    it('displays client information in preview', async () => {
      await generateAndPreview();

      expect(screen.getByText('Bill To')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('acme@test.com')).toBeInTheDocument();
      expect(screen.getByText('Matched')).toBeInTheDocument();
    });

    it('displays line items in table', async () => {
      await generateAndPreview();

      expect(screen.getByText('Web Development')).toBeInTheDocument();
      expect(screen.getByText('40')).toBeInTheDocument();
      expect(screen.getByText('$125.00')).toBeInTheDocument();
      // $5000.00 appears as both line item amount and subtotal
      const fiveKAmounts = screen.getAllByText('$5000.00');
      expect(fiveKAmounts.length).toBeGreaterThanOrEqual(1);
    });

    it('displays totals correctly', async () => {
      await generateAndPreview();

      expect(screen.getByText('Subtotal')).toBeInTheDocument();
      expect(screen.getByText(/8.50%/)).toBeInTheDocument();
      expect(screen.getByText('$425.00')).toBeInTheDocument();
      expect(screen.getByText('$5425.00')).toBeInTheDocument();
    });

    it('displays notes', async () => {
      await generateAndPreview();
      expect(screen.getByText('Net 14 payment terms')).toBeInTheDocument();
    });

    it('has Start Over button that resets to input state', async () => {
      const user = await generateAndPreview();

      await user.click(screen.getByRole('button', { name: 'Start Over' }));

      expect(screen.getByText('Describe your work')).toBeInTheDocument();
      expect(screen.queryByText('Invoice Preview')).not.toBeInTheDocument();
    });

    it('has Save as Draft button that navigates to invoice', async () => {
      const user = await generateAndPreview();

      await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

      expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices/inv-1');
    });

    it('has Edit Invoice button that navigates to edit page', async () => {
      const user = await generateAndPreview();

      await user.click(screen.getByRole('button', { name: 'Edit Invoice' }));

      expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices/inv-1/edit');
    });
  });
});
