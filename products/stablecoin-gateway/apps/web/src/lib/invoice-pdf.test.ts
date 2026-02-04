import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create a persistent mock document instance
const mockDoc = {
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  setDrawColor: vi.fn(),
  text: vi.fn(),
  line: vi.fn(),
  save: vi.fn(),
  lastAutoTable: { finalY: 100 },
};

// Mock jspdf before importing the module
vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => mockDoc),
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

import { generateInvoicePdf, exportAllInvoicesCsv } from './invoice-pdf';

describe('invoice-pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockInvoice = {
    id: 'INV-ABC123',
    paymentId: 'ps_abc123',
    amount: '$100.00',
    currency: 'USD',
    status: 'Paid',
    customer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    date: 'Jan 15, 2026',
  };

  it('generates a PDF for a single invoice', () => {
    generateInvoicePdf(mockInvoice);
    expect(mockDoc.save).toHaveBeenCalledWith('INV-ABC123.pdf');
  });

  it('creates PDF with invoice data', () => {
    generateInvoicePdf(mockInvoice);
    expect(mockDoc.text).toHaveBeenCalledWith('StableFlow', 14, 22);
    expect(mockDoc.text).toHaveBeenCalledWith('INVOICE', 150, 22);
    expect(mockDoc.text).toHaveBeenCalledWith('INV-ABC123', 150, 28);
  });

  it('exports CSV for multiple invoices', () => {
    // Mock URL.createObjectURL and the anchor element
    const mockCreateObjectURL = vi.fn(() => 'blob:url');
    const mockRevokeObjectURL = vi.fn();
    const mockClick = vi.fn();
    const mockCreateElement = vi.fn(() => ({
      href: '',
      download: '',
      click: mockClick,
    }));

    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL },
      writable: true,
    });
    vi.spyOn(document, 'createElement').mockImplementation(mockCreateElement as any);

    exportAllInvoicesCsv([mockInvoice]);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('generates correct CSV content', () => {
    const mockCreateObjectURL = vi.fn(() => 'blob:url');
    const mockRevokeObjectURL = vi.fn();
    let capturedBlob: Blob | undefined;

    Object.defineProperty(globalThis, 'URL', {
      value: {
        createObjectURL: (blob: Blob) => { capturedBlob = blob; return mockCreateObjectURL(blob); },
        revokeObjectURL: mockRevokeObjectURL,
      },
      writable: true,
    });
    vi.spyOn(document, 'createElement').mockImplementation(() => ({
      href: '',
      download: '',
      click: vi.fn(),
    }) as any);

    exportAllInvoicesCsv([mockInvoice]);

    expect(capturedBlob).toBeDefined();
    expect(capturedBlob!.type).toBe('text/csv;charset=utf-8;');
  });
});
