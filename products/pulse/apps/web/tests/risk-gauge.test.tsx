import { render, screen } from '@testing-library/react';
import RiskGauge from '../src/components/dashboard/RiskGauge';

describe('RiskGauge', () => {
  it('renders the label', () => {
    render(<RiskGauge score={42} />);
    expect(screen.getByText('Sprint Risk')).toBeInTheDocument();
  });

  it('renders a custom label', () => {
    render(<RiskGauge score={42} label="Project Risk" />);
    expect(screen.getByText('Project Risk')).toBeInTheDocument();
  });

  it('renders the score value', () => {
    render(<RiskGauge score={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows Low for scores <= 30', () => {
    render(<RiskGauge score={25} />);
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('shows Medium for scores between 31-60', () => {
    render(<RiskGauge score={42} />);
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('shows High for scores > 60', () => {
    render(<RiskGauge score={75} />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('clamps score to 0 minimum', () => {
    render(<RiskGauge score={-10} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('clamps score to 100 maximum', () => {
    render(<RiskGauge score={150} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
