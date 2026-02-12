import { render, screen, waitFor } from '@testing-library/react';
import RiskPage from '../src/app/dashboard/risk/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('teamId=default'),
}));

// Mock the api-client module (inline data to avoid hoisting issues)
jest.mock('../src/lib/api-client', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      score: 42,
      level: 'medium',
      explanation:
        'Sprint velocity has decreased by 15% compared to the trailing 4-week average. PR cycle time has increased, suggesting review bottlenecks.',
      recommendations: [
        'Break large PRs into smaller, focused changes',
        'Schedule dedicated code review time blocks',
      ],
      factors: [
        { name: 'Velocity Trend', score: 55, weight: 0.35, detail: 'Velocity decreased 15% vs 4-week avg' },
        { name: 'PR Cycle Time', score: 48, weight: 0.25, detail: 'Median cycle time up to 28h' },
        { name: 'Test Coverage', score: 30, weight: 0.2, detail: 'Coverage stable at 82%' },
        { name: 'Code Churn', score: 35, weight: 0.2, detail: 'Churn rate within normal range' },
      ],
      calculatedAt: '2026-01-15T10:30:00Z',
    }),
  },
}));

describe('Risk Page', () => {
  it('renders the page heading', async () => {
    render(<RiskPage />);
    await waitFor(() => {
      expect(screen.getByText('AI Sprint Risk')).toBeInTheDocument();
    });
  });

  it('renders the page description', async () => {
    render(<RiskPage />);
    await waitFor(() => {
      expect(
        screen.getByText(/AI-predicted sprint risk with natural language explanations/i)
      ).toBeInTheDocument();
    });
  });

  it('renders the risk gauge with a score', async () => {
    render(<RiskPage />);
    await waitFor(() => {
      expect(screen.getByText('Sprint Risk')).toBeInTheDocument();
    });
  });

  it('renders the risk level badge', async () => {
    render(<RiskPage />);
    await waitFor(() => {
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });
  });

  it('renders the AI explanation section', async () => {
    render(<RiskPage />);
    await waitFor(() => {
      expect(screen.getByText('AI Explanation')).toBeInTheDocument();
    });
  });

  it('renders AI explanation text', async () => {
    render(<RiskPage />);
    await waitFor(() => {
      expect(
        screen.getByText(/sprint velocity has decreased/i)
      ).toBeInTheDocument();
    });
  });

  it('renders the factor breakdown heading', async () => {
    render(<RiskPage />);
    await waitFor(() => {
      expect(screen.getByText('Risk Factors')).toBeInTheDocument();
    });
  });

  it('renders factor names in the breakdown', async () => {
    render(<RiskPage />);
    await waitFor(() => {
      expect(screen.getByText('Velocity Trend')).toBeInTheDocument();
      expect(screen.getByText('PR Cycle Time')).toBeInTheDocument();
      expect(screen.getByText('Test Coverage')).toBeInTheDocument();
      expect(screen.getByText('Code Churn')).toBeInTheDocument();
    });
  });

  it('renders factor scores', async () => {
    render(<RiskPage />);
    await waitFor(() => {
      const factorScores = screen.getAllByTestId('factor-score');
      expect(factorScores.length).toBeGreaterThanOrEqual(4);
    });
  });

  it('renders factor weights', async () => {
    render(<RiskPage />);
    await waitFor(() => {
      const factorWeights = screen.getAllByTestId('factor-weight');
      expect(factorWeights.length).toBeGreaterThanOrEqual(4);
    });
  });

  it('renders factor detail descriptions', async () => {
    render(<RiskPage />);
    await waitFor(() => {
      const factorDetails = screen.getAllByTestId('factor-detail');
      expect(factorDetails.length).toBeGreaterThanOrEqual(4);
    });
  });

  it('renders a link to risk history', async () => {
    render(<RiskPage />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /view history/i })).toBeInTheDocument();
    });
  });

  it('links to the correct history URL', async () => {
    render(<RiskPage />);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /view history/i });
      expect(link).toHaveAttribute('href', '/dashboard/risk/history');
    });
  });

  it('renders last calculated timestamp', async () => {
    render(<RiskPage />);
    await waitFor(() => {
      expect(screen.getByText(/last calculated/i)).toBeInTheDocument();
    });
  });
});
