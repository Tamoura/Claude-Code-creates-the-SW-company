import { render, screen, fireEvent } from '@testing-library/react';
import VelocityPage from '../src/app/dashboard/velocity/page';

// Mock recharts to avoid rendering issues in test environment
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('Velocity Page', () => {
  it('renders the page heading', () => {
    render(<VelocityPage />);
    expect(screen.getByText('Team Velocity')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<VelocityPage />);
    expect(
      screen.getByText(/PR merge rates, cycle time trends/i)
    ).toBeInTheDocument();
  });

  it('renders the date range selector', () => {
    render(<VelocityPage />);
    expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '90d' })).toBeInTheDocument();
  });

  it('renders velocity stat cards', () => {
    render(<VelocityPage />);
    expect(screen.getByText('PRs Merged')).toBeInTheDocument();
    expect(screen.getByText('Median Cycle Time')).toBeInTheDocument();
    expect(screen.getByText('Review Time')).toBeInTheDocument();
  });

  it('renders the PRs merged chart section', () => {
    render(<VelocityPage />);
    expect(screen.getByText('PRs Merged Per Week')).toBeInTheDocument();
  });

  it('renders the cycle time chart section', () => {
    render(<VelocityPage />);
    expect(screen.getByText('Cycle Time Trend')).toBeInTheDocument();
  });

  it('changes date range when selector is clicked', () => {
    render(<VelocityPage />);
    const btn30d = screen.getByRole('button', { name: '30d' });
    fireEvent.click(btn30d);
    expect(btn30d.className).toContain('bg-indigo-600');
  });

  it('renders the bar chart for PRs merged', () => {
    render(<VelocityPage />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders the line chart for cycle time', () => {
    render(<VelocityPage />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});
