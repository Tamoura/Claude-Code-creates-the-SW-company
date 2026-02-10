import { render, screen } from '@testing-library/react';
import VelocityChart from '../src/components/charts/VelocityChart';

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-count={data?.length || 0}>{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('VelocityChart', () => {
  it('renders the chart title', () => {
    render(<VelocityChart />);
    expect(screen.getByText('PRs Merged Per Week')).toBeInTheDocument();
  });

  it('renders the bar chart', () => {
    render(<VelocityChart />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders with default data', () => {
    render(<VelocityChart />);
    const chart = screen.getByTestId('bar-chart');
    expect(Number(chart.getAttribute('data-count'))).toBeGreaterThan(0);
  });

  it('renders with custom data', () => {
    const customData = [
      { week: 'W1', merged: 10 },
      { week: 'W2', merged: 20 },
    ];
    render(<VelocityChart data={customData} />);
    const chart = screen.getByTestId('bar-chart');
    expect(chart.getAttribute('data-count')).toBe('2');
  });

  it('renders within a card container', () => {
    const { container } = render(<VelocityChart />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('rounded-xl');
    expect(card.className).toContain('bg-[var(--bg-card)]');
  });
});
