import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UseCaseCard from './UseCaseCard';
import { UseCase } from '../../types';

const mockUseCase: UseCase = {
  id: '1',
  slug: 'test-case',
  title: 'Test Use Case',
  shortDescription: 'A test description',
  fullDescription: 'Full description',
  industry: ['finance', 'pharmaceuticals'],
  problemType: 'optimization',
  maturityLevel: 'experimental',
  quantumAdvantage: 'Advantage',
  timeline: { current: 'Now', nearTerm: 'Soon', longTerm: 'Later' },
  requirements: { qubits: 100, gateDepth: 500, errorRate: 0.01, coherenceTime: '50us' },
  examples: [],
  relatedUseCases: [],
  lastUpdated: '2026-01-01',
};

describe('UseCaseCard', () => {
  it('renders use case title and description', () => {
    render(
      <BrowserRouter>
        <UseCaseCard useCase={mockUseCase} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Use Case')).toBeInTheDocument();
    expect(screen.getByText('A test description')).toBeInTheDocument();
  });

  it('shows maturity level badge', () => {
    render(
      <BrowserRouter>
        <UseCaseCard useCase={mockUseCase} />
      </BrowserRouter>
    );

    expect(screen.getByText('Experimental')).toBeInTheDocument();
  });

  it('calls onSelect when select button clicked', () => {
    const onSelect = vi.fn();
    render(
      <BrowserRouter>
        <UseCaseCard useCase={mockUseCase} onSelect={onSelect} />
      </BrowserRouter>
    );

    const selectButton = screen.getByText('Select');
    fireEvent.click(selectButton);
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
