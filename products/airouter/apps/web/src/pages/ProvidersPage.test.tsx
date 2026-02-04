import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProvidersPage from './ProvidersPage';

// Mock useAuth to prevent auth issues in test
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

function renderProviders() {
  return render(
    <BrowserRouter>
      <ProvidersPage />
    </BrowserRouter>
  );
}

describe('ProvidersPage', () => {
  it('renders the Provider Directory heading', async () => {
    renderProviders();

    await waitFor(() => {
      expect(
        screen.getByText('Provider Directory')
      ).toBeInTheDocument();
    });
  });

  it('renders the search input', async () => {
    renderProviders();

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Search providers...')
      ).toBeInTheDocument();
    });
  });

  it('renders provider cards after loading', async () => {
    renderProviders();

    await waitFor(() => {
      expect(screen.getByText('Google Gemini')).toBeInTheDocument();
      expect(screen.getByText('Groq')).toBeInTheDocument();
      expect(screen.getByText('Cerebras')).toBeInTheDocument();
      expect(screen.getByText('SambaNova')).toBeInTheDocument();
      expect(screen.getByText('DeepSeek')).toBeInTheDocument();
    });
  });

  it('renders all 10 providers', async () => {
    renderProviders();

    await waitFor(() => {
      expect(screen.getByText('Google Gemini')).toBeInTheDocument();
      expect(screen.getByText('Groq')).toBeInTheDocument();
      expect(screen.getByText('Cerebras')).toBeInTheDocument();
      expect(screen.getByText('SambaNova')).toBeInTheDocument();
      expect(screen.getByText('OpenRouter')).toBeInTheDocument();
      expect(screen.getByText('Cohere')).toBeInTheDocument();
      expect(screen.getByText('HuggingFace')).toBeInTheDocument();
      expect(screen.getByText('Mistral')).toBeInTheDocument();
      expect(screen.getByText('Cloudflare Workers AI')).toBeInTheDocument();
      expect(screen.getByText('DeepSeek')).toBeInTheDocument();
    });
  });

  it('renders Add Key buttons for each provider', async () => {
    renderProviders();

    await waitFor(() => {
      const addButtons = screen.getAllByText('Add Key');
      expect(addButtons.length).toBe(10);
    });
  });

  it('renders model filter dropdown', async () => {
    renderProviders();

    await waitFor(() => {
      expect(
        screen.getByRole('combobox', { name: /filter by model/i })
      ).toBeInTheDocument();
    });
  });

  it('renders status badges on provider cards', async () => {
    renderProviders();

    await waitFor(() => {
      // At least some providers should show "Operational" status
      const operationalBadges = screen.getAllByText('Operational');
      expect(operationalBadges.length).toBeGreaterThan(0);
    });
  });
});
