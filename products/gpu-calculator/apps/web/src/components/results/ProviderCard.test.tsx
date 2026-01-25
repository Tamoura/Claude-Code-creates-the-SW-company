import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderCard } from './ProviderCard';
import type { ProviderResult } from '../../types';

describe('ProviderCard', () => {
  const mockResult: ProviderResult = {
    providerId: 'aws',
    providerName: 'Amazon Web Services',
    available: true,
    costs: {
      compute: 1000,
      storage: 50,
      egress: 25,
      total: 1075,
      currency: 'USD',
    },
    configuration: {
      gpuType: 'A100-80GB',
      instanceType: 'p4d.24xlarge',
      gpuCount: 8,
      hourlyRate: 32.77,
      estimatedHours: 30.5,
      storageGb: 100,
      egressGb: 10,
    },
  };

  it('should render provider name', () => {
    render(<ProviderCard result={mockResult} />);

    expect(screen.getByText('Amazon Web Services')).toBeInTheDocument();
  });

  it('should display total cost', () => {
    render(<ProviderCard result={mockResult} />);

    expect(screen.getByText(/\$1,075/)).toBeInTheDocument();
  });

  it('should show cost breakdown', () => {
    render(<ProviderCard result={mockResult} />);

    expect(screen.getByText(/Compute:/)).toBeInTheDocument();
    expect(screen.getByText(/\$1,000/)).toBeInTheDocument();
    expect(screen.getByText(/Storage:/)).toBeInTheDocument();
    expect(screen.getByText(/\$50/)).toBeInTheDocument();
  });

  it('should display unavailable state', () => {
    const unavailableResult: ProviderResult = {
      ...mockResult,
      available: false,
      unavailableReason: 'GPU not available',
    };

    render(<ProviderCard result={unavailableResult} />);

    expect(screen.getByText('Not Available')).toBeInTheDocument();
    expect(screen.getByText('GPU not available')).toBeInTheDocument();
  });

  it('should show GPU configuration', () => {
    render(<ProviderCard result={mockResult} />);

    expect(screen.getByText(/A100-80GB/)).toBeInTheDocument();
    expect(screen.getByText(/8 GPUs/)).toBeInTheDocument(); // GPU count
  });
});
