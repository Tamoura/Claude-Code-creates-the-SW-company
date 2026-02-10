import { render, screen } from '@testing-library/react';
import RadarChart from '../../src/components/dashboard/RadarChart';
import type { DimensionScore } from '../../src/components/dashboard/RadarChart';

// Mock recharts as it relies on browser APIs
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactNode;
    }) => <div data-testid="responsive-container">{children}</div>,
    RadarChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="radar-chart">{children}</div>
    ),
    Radar: () => <div data-testid="radar" />,
    PolarGrid: () => <div data-testid="polar-grid" />,
    PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
    PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
    Tooltip: () => <div data-testid="tooltip" />,
  };
});

describe('RadarChart', () => {
  const sampleScores: DimensionScore[] = [
    { dimension: 'Academic', score: 75, fullMark: 100 },
    { dimension: 'Social-Emotional', score: 60, fullMark: 100 },
    { dimension: 'Behavioural', score: 45, fullMark: 100 },
    { dimension: 'Aspirational', score: 80, fullMark: 100 },
    { dimension: 'Islamic', score: 90, fullMark: 100 },
    { dimension: 'Physical', score: 55, fullMark: 100 },
  ];

  it('renders with default scores (all zeros)', () => {
    render(<RadarChart />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders with provided scores', () => {
    render(<RadarChart scores={sampleScores} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('has accessible aria-label', () => {
    render(<RadarChart scores={sampleScores} />);
    expect(
      screen.getByLabelText(
        'Six-dimension radar chart showing child development scores'
      )
    ).toBeInTheDocument();
  });

  it('renders the recharts components', () => {
    render(<RadarChart scores={sampleScores} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('radar')).toBeInTheDocument();
  });
});
