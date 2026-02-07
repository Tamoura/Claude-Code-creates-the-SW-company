import { render, screen, fireEvent } from '@testing-library/react';
import RiskHistoryPage from '../src/app/dashboard/risk/history/page';

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('Risk History Page', () => {
  it('renders the page heading', () => {
    render(<RiskHistoryPage />);
    expect(screen.getByText('Risk History')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<RiskHistoryPage />);
    expect(
      screen.getByText(/historical risk scores with event correlation/i)
    ).toBeInTheDocument();
  });

  it('renders the date range selector', () => {
    render(<RiskHistoryPage />);
    expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '90d' })).toBeInTheDocument();
  });

  it('defaults to 30d range selected', () => {
    render(<RiskHistoryPage />);
    const activeBtn = screen.getByRole('button', { name: '30d' });
    expect(activeBtn.className).toContain('bg-indigo-600');
  });

  it('renders the risk trend chart', () => {
    render(<RiskHistoryPage />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders the chart title', () => {
    render(<RiskHistoryPage />);
    expect(screen.getByText('Risk Score Trend')).toBeInTheDocument();
  });

  it('renders historical snapshots section', () => {
    render(<RiskHistoryPage />);
    expect(screen.getByText('Historical Snapshots')).toBeInTheDocument();
  });

  it('renders snapshot entries with dates', () => {
    render(<RiskHistoryPage />);
    const snapshots = screen.getAllByTestId('snapshot-entry');
    expect(snapshots.length).toBeGreaterThanOrEqual(3);
  });

  it('renders snapshot scores', () => {
    render(<RiskHistoryPage />);
    const scores = screen.getAllByTestId('snapshot-score');
    expect(scores.length).toBeGreaterThanOrEqual(3);
  });

  it('renders snapshot levels', () => {
    render(<RiskHistoryPage />);
    const levels = screen.getAllByTestId('snapshot-level');
    expect(levels.length).toBeGreaterThanOrEqual(3);
  });

  it('renders a back link to current risk', () => {
    render(<RiskHistoryPage />);
    const link = screen.getByRole('link', { name: /back to current risk/i });
    expect(link).toHaveAttribute('href', '/dashboard/risk');
  });

  it('changes date range when clicking a range button', () => {
    render(<RiskHistoryPage />);
    const btn7d = screen.getByRole('button', { name: '7d' });
    fireEvent.click(btn7d);
    expect(btn7d.className).toContain('bg-indigo-600');
  });
});
