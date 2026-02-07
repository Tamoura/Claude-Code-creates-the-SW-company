import { render, screen, fireEvent } from '@testing-library/react';
import QualityPage from '../src/app/dashboard/quality/page';

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('Quality Page', () => {
  it('renders the page heading', () => {
    render(<QualityPage />);
    expect(screen.getByText('Code Quality')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<QualityPage />);
    expect(
      screen.getByText(/test coverage trends/i)
    ).toBeInTheDocument();
  });

  it('renders the date range selector', () => {
    render(<QualityPage />);
    expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '90d' })).toBeInTheDocument();
  });

  it('renders quality stat cards', () => {
    render(<QualityPage />);
    expect(screen.getByText('Test Coverage')).toBeInTheDocument();
    expect(screen.getByText('Avg PR Size')).toBeInTheDocument();
    expect(screen.getByText('Review Comments')).toBeInTheDocument();
  });

  it('renders the coverage trend chart section', () => {
    render(<QualityPage />);
    expect(screen.getByText('Test Coverage Trend')).toBeInTheDocument();
  });

  it('renders the PR size distribution chart section', () => {
    render(<QualityPage />);
    expect(screen.getByText('PR Size Distribution')).toBeInTheDocument();
  });

  it('renders the area chart for coverage', () => {
    render(<QualityPage />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('renders the bar chart for PR sizes', () => {
    render(<QualityPage />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('changes date range when selector is clicked', () => {
    render(<QualityPage />);
    const btn90d = screen.getByRole('button', { name: '90d' });
    fireEvent.click(btn90d);
    expect(btn90d.className).toContain('bg-indigo-600');
  });
});
