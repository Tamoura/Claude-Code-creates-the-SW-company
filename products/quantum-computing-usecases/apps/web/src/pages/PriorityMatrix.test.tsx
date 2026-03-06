import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import i18n from '../i18n/i18n';
import PriorityMatrix from './PriorityMatrix';

function renderPriorityMatrix() {
  return render(
    <BrowserRouter>
      <PriorityMatrix />
    </BrowserRouter>
  );
}

describe('PriorityMatrix', () => {
  beforeEach(() => {
    i18n.changeLanguage('en');
  });

  it('renders the priority matrix heading', () => {
    renderPriorityMatrix();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/priority matrix/i);
  });

  it('displays quadrant labels', () => {
    renderPriorityMatrix();
    // Quadrant labels appear both in the matrix and in the grouped cards
    expect(screen.getAllByText(/quick wins/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/strategic bets/i).length).toBeGreaterThan(0);
  });

  it('renders use case dots in the matrix', () => {
    renderPriorityMatrix();
    const dots = screen.getAllByTestId('matrix-dot');
    expect(dots.length).toBeGreaterThan(0);
  });

  it('shows axis labels', () => {
    renderPriorityMatrix();
    // Axis labels contain arrow entity, check for partial match
    expect(screen.getAllByText(/feasibility/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/business impact/i).length).toBeGreaterThan(0);
  });
});
