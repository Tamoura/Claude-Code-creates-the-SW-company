import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProviderDetailPage from './ProviderDetailPage';

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

function renderPage(slug = 'google-gemini') {
  return render(
    <MemoryRouter initialEntries={[`/dashboard/providers/${slug}`]}>
      <Routes>
        <Route path="/dashboard/providers/:slug" element={<ProviderDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProviderDetailPage', () => {
  it('renders the provider name', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Google Gemini' })).toBeInTheDocument();
    });
  });

  it('renders the provider description', async () => {
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(/multimodal AI with generous free tier/i)
      ).toBeInTheDocument();
    });
  });

  it('renders the category badge', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Multimodal')).toBeInTheDocument();
    });
  });

  it('renders acquisition guide steps', async () => {
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(/Google AI Studio/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Sign in with your Google account/i)
      ).toBeInTheDocument();
    });
  });

  it('renders tips section', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tips')).toBeInTheDocument();
      expect(
        screen.getByText(/Gemini 2.5 Flash is best for fast/i)
      ).toBeInTheDocument();
    });
  });

  it('renders gotchas section', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Gotchas')).toBeInTheDocument();
      expect(
        screen.getByText(/Free tier is per-project/i)
      ).toBeInTheDocument();
    });
  });

  it('renders verification steps', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Verify Your Key')).toBeInTheDocument();
      expect(
        screen.getByText(/curl/i)
      ).toBeInTheDocument();
    });
  });

  it('renders models list', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('gemini-2.5-flash')).toBeInTheDocument();
      expect(screen.getByText('gemini-2.5-pro')).toBeInTheDocument();
    });
  });

  it('renders the last verified date', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Last verified/)).toBeInTheDocument();
    });
  });

  it('shows not found for unknown provider', async () => {
    renderPage('nonexistent-provider');

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });

  it('renders Add Your Key button', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Add Your.*Key/)).toBeInTheDocument();
    });
  });
});
