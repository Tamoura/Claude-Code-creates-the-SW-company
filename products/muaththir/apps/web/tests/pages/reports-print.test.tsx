import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) =>
    React.createElement('a', { href, ...props }, children);
});

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => '/dashboard/reports',
}));

// Mock the apiClient
jest.mock('../../src/lib/api-client', () => ({
  apiClient: {
    getChildren: jest.fn(),
    getDashboard: jest.fn(),
  },
}));

// Mock ExportCSV
jest.mock('../../src/components/reports/ExportCSV', () => {
  return function MockExportCSV() {
    return React.createElement('button', null, 'Export CSV');
  };
});

// Mock date-format
jest.mock('../../src/lib/date-format', () => ({
  formatDateLong: () => 'February 12, 2026',
}));

// Mock dimensions
jest.mock('../../src/lib/dimensions', () => ({
  getDimensionBySlug: (slug: string) => ({
    slug,
    colour: '#3B82F6',
    icon: 'A',
    name: slug,
  }),
}));

import ReportsPage from '../../src/app/dashboard/reports/page';
import { apiClient } from '../../src/lib/api-client';

const mockChildren = [
  { id: 'c1', name: 'Ahmad', dateOfBirth: '2018-01-01', gender: 'male', ageBand: '6_8', photoUrl: null, medicalNotes: null, allergies: null, specialNeeds: null, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
];

const mockDashboard = {
  childId: 'c1',
  childName: 'Ahmad',
  ageBand: '6_8',
  overallScore: 72,
  dimensions: [
    { dimension: 'academic', score: 80, factors: { observation: 30, milestone: 35, sentiment: 15 }, observationCount: 5, milestoneProgress: { achieved: 3, total: 5 } },
    { dimension: 'behavioural', score: 65, factors: { observation: 25, milestone: 25, sentiment: 15 }, observationCount: 3, milestoneProgress: { achieved: 2, total: 5 } },
  ],
  calculatedAt: '2025-01-01',
};

// Helper: wait for the dashboard content to fully render
async function waitForDashboardToLoad() {
  // Wait for "Overall Score" text to appear, indicating dashboard loaded
  await screen.findByText('Overall Score');
}

describe('ReportsPage - Print Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.getChildren as jest.Mock).mockResolvedValue({
      data: mockChildren,
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
    });
    (apiClient.getDashboard as jest.Mock).mockResolvedValue(mockDashboard);
  });

  it('renders the Download Report button', async () => {
    render(React.createElement(ReportsPage));

    const downloadBtn = await screen.findByRole('button', { name: /download report/i });
    expect(downloadBtn).toBeInTheDocument();
  });

  it('applies print-ready class to report content when Download Report is clicked', async () => {
    const printSpy = jest.fn();
    window.print = printSpy;

    render(React.createElement(ReportsPage));
    await waitForDashboardToLoad();

    const downloadBtn = screen.getByRole('button', { name: /download report/i });
    fireEvent.click(downloadBtn);

    const reportContent = document.getElementById('report-content');
    expect(reportContent).toBeInTheDocument();
    expect(reportContent).toHaveClass('print-ready');
    expect(printSpy).toHaveBeenCalled();
  });

  it('removes print-ready class after printing (via afterprint event)', async () => {
    window.print = jest.fn();

    render(React.createElement(ReportsPage));
    await waitForDashboardToLoad();

    const downloadBtn = screen.getByRole('button', { name: /download report/i });
    fireEvent.click(downloadBtn);

    const reportContent = document.getElementById('report-content');
    expect(reportContent).toHaveClass('print-ready');

    // Simulate the afterprint event
    window.dispatchEvent(new Event('afterprint'));

    expect(reportContent).not.toHaveClass('print-ready');
  });

  it('still has the original Print Report button', async () => {
    render(React.createElement(ReportsPage));
    const printBtn = await screen.findByRole('button', { name: /print report/i });
    expect(printBtn).toBeInTheDocument();
  });

  it('renders a print-only header with child name', async () => {
    render(React.createElement(ReportsPage));
    await waitForDashboardToLoad();

    const printHeader = document.querySelector('[data-testid="print-header"]');
    expect(printHeader).toBeInTheDocument();
    expect(printHeader).toHaveTextContent('Ahmad');
  });
});
