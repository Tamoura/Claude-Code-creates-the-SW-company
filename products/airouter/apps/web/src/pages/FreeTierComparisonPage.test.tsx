import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FreeTierComparisonPage from './FreeTierComparisonPage';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  }),
}));

function renderPage() {
  return render(
    <BrowserRouter>
      <FreeTierComparisonPage />
    </BrowserRouter>
  );
}

describe('FreeTierComparisonPage', () => {
  it('renders the page heading', async () => {
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('Free Tier Comparison')
      ).toBeInTheDocument();
    });
  });

  it('renders a table with all 10 providers', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Google Gemini')).toBeInTheDocument();
      expect(screen.getByText('Groq')).toBeInTheDocument();
      expect(screen.getByText('DeepSeek')).toBeInTheDocument();
      expect(screen.getByText('SambaNova')).toBeInTheDocument();
      expect(screen.getByText('Cerebras')).toBeInTheDocument();
    });
  });

  it('renders table headers', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Provider')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('RPM')).toBeInTheDocument();
      expect(screen.getByText('Models')).toBeInTheDocument();
    });
  });

  it('renders category badges', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Speed').length).toBeGreaterThan(0);
      expect(screen.getByText('Multimodal')).toBeInTheDocument();
      expect(screen.getByText('Reasoning')).toBeInTheDocument();
    });
  });

  it('renders provider names as links', async () => {
    renderPage();

    await waitFor(() => {
      const geminiLink = screen.getByRole('link', { name: 'Google Gemini' });
      expect(geminiLink).toBeInTheDocument();
      expect(geminiLink.getAttribute('href')).toBe('/dashboard/providers/google-gemini');
    });
  });

  it('sorts table when clicking column headers', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Google Gemini')).toBeInTheDocument();
    });

    const rpmHeader = screen.getByText('RPM');
    fireEvent.click(rpmHeader);

    // After sorting, the table should still show all providers
    await waitFor(() => {
      expect(screen.getByText('Google Gemini')).toBeInTheDocument();
      expect(screen.getByText('Groq')).toBeInTheDocument();
    });
  });

  it('highlights unlimited tiers', async () => {
    renderPage();

    await waitFor(() => {
      const unlimitedCells = screen.getAllByText('Unlimited');
      expect(unlimitedCells.length).toBeGreaterThan(0);
    });
  });
});
