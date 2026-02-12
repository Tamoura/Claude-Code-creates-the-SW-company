import { render, screen } from '@testing-library/react';
import CoverageChart from '../src/components/charts/CoverageChart';

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="area-chart" data-count={data?.length || 0}>{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('CoverageChart', () => {
  it('renders the chart title', () => {
    render(<CoverageChart />);
    expect(screen.getByRole('heading', { name: 'Test Coverage Trend' })).toBeInTheDocument();
  });

  it('renders the area chart', () => {
    render(<CoverageChart />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('renders with default data', () => {
    render(<CoverageChart />);
    const chart = screen.getByTestId('area-chart');
    expect(Number(chart.getAttribute('data-count'))).toBeGreaterThan(0);
  });

  it('renders with custom data', () => {
    const customData = [
      { date: 'Jan 1', coverage: 80 },
      { date: 'Jan 8', coverage: 85 },
      { date: 'Jan 15', coverage: 90 },
    ];
    render(<CoverageChart data={customData} />);
    const chart = screen.getByTestId('area-chart');
    expect(chart.getAttribute('data-count')).toBe('3');
  });

  it('renders within a card container', () => {
    const { container } = render(<CoverageChart />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('rounded-xl');
    expect(card.className).toContain('bg-[var(--bg-card)]');
  });
});
