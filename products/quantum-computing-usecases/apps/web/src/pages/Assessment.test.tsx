import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import i18n from '../i18n/i18n';
import Assessment from './Assessment';

function renderAssessment() {
  return render(
    <BrowserRouter>
      <Assessment />
    </BrowserRouter>
  );
}

describe('Assessment', () => {
  beforeEach(() => {
    i18n.changeLanguage('en');
  });

  it('renders the assessment heading', () => {
    renderAssessment();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/readiness assessment/i);
  });

  it('displays assessment questions', () => {
    renderAssessment();
    expect(screen.getByText(/quantum computing expertise/i)).toBeInTheDocument();
  });

  it('allows selecting answers', () => {
    renderAssessment();
    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons.length).toBeGreaterThan(0);
    fireEvent.click(radioButtons[0]);
    expect(radioButtons[0]).toBeChecked();
  });

  it('shows results after completing assessment', () => {
    renderAssessment();
    const submitButton = screen.getByRole('button', { name: /view results/i });
    fireEvent.click(submitButton);
    expect(screen.getByText(/readiness score/i)).toBeInTheDocument();
  });
});
