import { render, screen } from '@testing-library/react';
import RiskPage from '../src/app/dashboard/risk/page';

describe('Risk Page', () => {
  it('renders the page heading', () => {
    render(<RiskPage />);
    expect(screen.getByText('AI Sprint Risk')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<RiskPage />);
    expect(
      screen.getByText(/AI-predicted sprint risk with natural language explanations/i)
    ).toBeInTheDocument();
  });

  it('renders the risk gauge with a score', () => {
    render(<RiskPage />);
    expect(screen.getByText('Sprint Risk')).toBeInTheDocument();
  });

  it('renders the risk level badge', () => {
    render(<RiskPage />);
    // The RiskGauge renders the level text (Low/Medium/High)
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('renders the AI explanation section', () => {
    render(<RiskPage />);
    expect(screen.getByText('AI Explanation')).toBeInTheDocument();
  });

  it('renders AI explanation text', () => {
    render(<RiskPage />);
    expect(
      screen.getByText(/sprint velocity has decreased/i)
    ).toBeInTheDocument();
  });

  it('renders the factor breakdown heading', () => {
    render(<RiskPage />);
    expect(screen.getByText('Risk Factors')).toBeInTheDocument();
  });

  it('renders factor names in the breakdown', () => {
    render(<RiskPage />);
    expect(screen.getByText('Velocity Trend')).toBeInTheDocument();
    expect(screen.getByText('PR Cycle Time')).toBeInTheDocument();
    expect(screen.getByText('Test Coverage')).toBeInTheDocument();
    expect(screen.getByText('Code Churn')).toBeInTheDocument();
  });

  it('renders factor scores', () => {
    render(<RiskPage />);
    // Factor scores should be visible (e.g., "55" for velocity trend)
    const factorScores = screen.getAllByTestId('factor-score');
    expect(factorScores.length).toBeGreaterThanOrEqual(4);
  });

  it('renders factor weights', () => {
    render(<RiskPage />);
    const factorWeights = screen.getAllByTestId('factor-weight');
    expect(factorWeights.length).toBeGreaterThanOrEqual(4);
  });

  it('renders factor detail descriptions', () => {
    render(<RiskPage />);
    const factorDetails = screen.getAllByTestId('factor-detail');
    expect(factorDetails.length).toBeGreaterThanOrEqual(4);
  });

  it('renders a link to risk history', () => {
    render(<RiskPage />);
    expect(screen.getByRole('link', { name: /view history/i })).toBeInTheDocument();
  });

  it('links to the correct history URL', () => {
    render(<RiskPage />);
    const link = screen.getByRole('link', { name: /view history/i });
    expect(link).toHaveAttribute('href', '/dashboard/risk/history');
  });

  it('renders last calculated timestamp', () => {
    render(<RiskPage />);
    expect(screen.getByText(/last calculated/i)).toBeInTheDocument();
  });
});
