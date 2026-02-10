import { render, screen } from '@testing-library/react';
import DashboardPage from '../src/app/dashboard/page';

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('Dashboard Page', () => {
  it('renders the page heading', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/engineering pulse at a glance/i)).toBeInTheDocument();
  });

  it('renders all KPI stat cards', () => {
    render(<DashboardPage />);
    expect(screen.getByText('PRs Merged (7d)')).toBeInTheDocument();
    expect(screen.getByText('Median Cycle Time')).toBeInTheDocument();
    expect(screen.getByText('Review Time')).toBeInTheDocument();
    expect(screen.getByText('Test Coverage')).toBeInTheDocument();
  });

  it('renders the risk gauge', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Sprint Risk')).toBeInTheDocument();
  });

  it('renders the activity feed', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('renders the velocity chart', () => {
    render(<DashboardPage />);
    expect(screen.getByText('PRs Merged Per Week')).toBeInTheDocument();
  });

  it('renders the coverage chart', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Test Coverage Trend')).toBeInTheDocument();
  });
});
