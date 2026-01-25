import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparisonGrid } from './ComparisonGrid';
import type { ProviderResult } from '../../types';

describe('ComparisonGrid', () => {
  const mockResults: ProviderResult[] = [
    {
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
    },
    {
      providerId: 'gcp',
      providerName: 'Google Cloud Platform',
      available: true,
      costs: {
        compute: 950,
        storage: 45,
        egress: 30,
        total: 1025,
        currency: 'USD',
      },
      configuration: {
        gpuType: 'A100-80GB',
        instanceType: 'a2-ultragpu-8g',
        gpuCount: 8,
        hourlyRate: 33.22,
        estimatedHours: 28.6,
        storageGb: 100,
        egressGb: 10,
      },
    },
  ];

  it('should render all provider results', () => {
    render(<ComparisonGrid results={mockResults} />);

    // Should render both provider names (may appear multiple times due to "best price")
    expect(screen.getAllByText(/Amazon Web Services/)).toHaveLength(1);
    expect(screen.getAllByText(/Google Cloud Platform/).length).toBeGreaterThanOrEqual(1);
  });

  it('should render empty state when no results', () => {
    render(<ComparisonGrid results={[]} />);

    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it('should display results in grid layout', () => {
    const { container } = render(<ComparisonGrid results={mockResults} />);

    // Check for grid container
    const grid = container.querySelector('[class*="grid"]');
    expect(grid).toBeInTheDocument();
  });
});
