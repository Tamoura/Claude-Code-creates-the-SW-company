import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApiKeys from './ApiKeys';
import * as useApiKeysModule from '../../hooks/useApiKeys';

// Mock the useApiKeys hook
vi.mock('../../hooks/useApiKeys');

describe('ApiKeys Page', () => {
  const mockApiKeys = [
    {
      id: 'key_1',
      name: 'Production Server',
      key_prefix: 'sk_live_12345...',
      permissions: { read: true, write: true, refund: false },
      created_at: '2024-01-15T10:00:00Z',
      last_used_at: '2024-02-01T15:30:00Z',
    },
    {
      id: 'key_2',
      name: 'Development',
      key_prefix: 'sk_test_67890...',
      permissions: { read: true, write: false, refund: false },
      created_at: '2024-01-10T08:00:00Z',
      last_used_at: null,
    },
  ];

  const mockCreateApiKey = vi.fn();
  const mockDeleteApiKey = vi.fn();
  const mockClearCreatedKey = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    vi.spyOn(useApiKeysModule, 'useApiKeys').mockReturnValue({
      apiKeys: mockApiKeys,
      isLoading: false,
      error: null,
      createdKey: null,
      createApiKey: mockCreateApiKey,
      deleteApiKey: mockDeleteApiKey,
      clearCreatedKey: mockClearCreatedKey,
    });
  });

  describe('Rendering', () => {
    it('renders page title and description', () => {
      render(<ApiKeys />);

      expect(screen.getByText('API Keys')).toBeInTheDocument();
      expect(screen.getByText(/manage your api keys for programmatic access/i)).toBeInTheDocument();
    });

    it('renders create API key button', () => {
      render(<ApiKeys />);

      expect(screen.getByRole('button', { name: /create api key/i })).toBeInTheDocument();
    });

    it('renders API keys list with data', () => {
      render(<ApiKeys />);

      expect(screen.getByText('Production Server')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('sk_live_12345...')).toBeInTheDocument();
      expect(screen.getByText('sk_test_67890...')).toBeInTheDocument();
    });

    it('displays key permissions as badges', () => {
      render(<ApiKeys />);

      // Production Server has read, write
      const permissionBadges = screen.getAllByText(/read|write/i);
      expect(permissionBadges.length).toBeGreaterThan(0);
    });

    it('shows creation date formatted correctly', () => {
      render(<ApiKeys />);

      expect(screen.getByText('1/15/2024')).toBeInTheDocument();
      expect(screen.getByText('1/10/2024')).toBeInTheDocument();
    });

    it('shows last used date or Never', () => {
      render(<ApiKeys />);

      expect(screen.getByText('2/1/2024')).toBeInTheDocument();
      expect(screen.getByText('Never')).toBeInTheDocument();
    });

    it('renders revoke button for each key', () => {
      render(<ApiKeys />);

      const revokeButtons = screen.getAllByRole('button', { name: /revoke/i });
      expect(revokeButtons).toHaveLength(2);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no API keys exist', () => {
      vi.spyOn(useApiKeysModule, 'useApiKeys').mockReturnValue({
        apiKeys: [],
        isLoading: false,
        error: null,
        createdKey: null,
        createApiKey: mockCreateApiKey,
        deleteApiKey: mockDeleteApiKey,
        clearCreatedKey: mockClearCreatedKey,
      });

      render(<ApiKeys />);

      expect(screen.getByText(/no api keys yet/i)).toBeInTheDocument();
    });

    it('shows loading state', () => {
      vi.spyOn(useApiKeysModule, 'useApiKeys').mockReturnValue({
        apiKeys: [],
        isLoading: true,
        error: null,
        createdKey: null,
        createApiKey: mockCreateApiKey,
        deleteApiKey: mockDeleteApiKey,
        clearCreatedKey: mockClearCreatedKey,
      });

      render(<ApiKeys />);

      expect(screen.getByText(/loading api keys/i)).toBeInTheDocument();
    });

    it('shows error message when error occurs', () => {
      vi.spyOn(useApiKeysModule, 'useApiKeys').mockReturnValue({
        apiKeys: [],
        isLoading: false,
        error: 'Failed to load API keys',
        createdKey: null,
        createApiKey: mockCreateApiKey,
        deleteApiKey: mockDeleteApiKey,
        clearCreatedKey: mockClearCreatedKey,
      });

      render(<ApiKeys />);

      expect(screen.getByText('Failed to load API keys')).toBeInTheDocument();
    });
  });

  describe('Create API Key Form', () => {
    it('shows form when create button is clicked', () => {
      render(<ApiKeys />);

      const createButton = screen.getByRole('button', { name: /create api key/i });
      fireEvent.click(createButton);

      expect(screen.getByLabelText(/key name/i)).toBeInTheDocument();
      expect(screen.getByText('Create New API Key')).toBeInTheDocument();
      // Check that checkboxes exist
      expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    });

    it('renders permission checkboxes', () => {
      render(<ApiKeys />);

      const createButton = screen.getByRole('button', { name: /create api key/i });
      fireEvent.click(createButton);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
      // Verify all three checkboxes are rendered for Read, Write, Refund permissions
      expect(checkboxes[0]).toBeInTheDocument();
      expect(checkboxes[1]).toBeInTheDocument();
      expect(checkboxes[2]).toBeInTheDocument();
    });

    it('submits form with correct data', async () => {
      mockCreateApiKey.mockResolvedValueOnce(undefined);

      render(<ApiKeys />);

      const createButton = screen.getByRole('button', { name: /create api key/i });
      fireEvent.click(createButton);

      const nameInput = screen.getByLabelText(/key name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Key' } });

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Click write permission

      const submitButton = screen.getByRole('button', { name: /create key/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateApiKey).toHaveBeenCalledWith({
          name: 'Test Key',
          permissions: { read: true, write: true, refund: false },
        });
      });
    });

    it('hides form after successful creation', async () => {
      mockCreateApiKey.mockResolvedValueOnce(undefined);

      render(<ApiKeys />);

      const createButton = screen.getByRole('button', { name: /create api key/i });
      fireEvent.click(createButton);

      const nameInput = screen.getByLabelText(/key name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Key' } });

      const submitButton = screen.getByRole('button', { name: /create key/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByLabelText(/key name/i)).not.toBeInTheDocument();
      });
    });

    it('cancels form when cancel button is clicked', () => {
      render(<ApiKeys />);

      const createButton = screen.getByRole('button', { name: /create api key/i });
      fireEvent.click(createButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByLabelText(/key name/i)).not.toBeInTheDocument();
    });
  });

  describe('Created Key Banner', () => {
    it('shows created key banner with full key', () => {
      vi.spyOn(useApiKeysModule, 'useApiKeys').mockReturnValue({
        apiKeys: mockApiKeys,
        isLoading: false,
        error: null,
        createdKey: {
          id: 'key_new',
          name: 'New Key',
          key: 'sk_live_full_key_12345678901234567890',
          key_prefix: 'sk_live_12345...',
          permissions: { read: true, write: false, refund: false },
          created_at: '2024-02-03T10:00:00Z',
          last_used_at: null,
        },
        createApiKey: mockCreateApiKey,
        deleteApiKey: mockDeleteApiKey,
        clearCreatedKey: mockClearCreatedKey,
      });

      render(<ApiKeys />);

      expect(screen.getByText(/api key created/i)).toBeInTheDocument();
      expect(screen.getByText('sk_live_full_key_12345678901234567890')).toBeInTheDocument();
    });

    it('allows copying the created key', async () => {
      const mockWriteText = vi.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      vi.spyOn(useApiKeysModule, 'useApiKeys').mockReturnValue({
        apiKeys: mockApiKeys,
        isLoading: false,
        error: null,
        createdKey: {
          id: 'key_new',
          name: 'New Key',
          key: 'sk_live_full_key',
          key_prefix: 'sk_live_...',
          permissions: { read: true, write: false, refund: false },
          created_at: '2024-02-03T10:00:00Z',
          last_used_at: null,
        },
        createApiKey: mockCreateApiKey,
        deleteApiKey: mockDeleteApiKey,
        clearCreatedKey: mockClearCreatedKey,
      });

      render(<ApiKeys />);

      const copyButton = screen.getByRole('button', { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('sk_live_full_key');
      });
    });

    it('dismisses banner when dismiss button is clicked', () => {
      vi.spyOn(useApiKeysModule, 'useApiKeys').mockReturnValue({
        apiKeys: mockApiKeys,
        isLoading: false,
        error: null,
        createdKey: {
          id: 'key_new',
          name: 'New Key',
          key: 'sk_live_full_key',
          key_prefix: 'sk_live_...',
          permissions: { read: true, write: false, refund: false },
          created_at: '2024-02-03T10:00:00Z',
          last_used_at: null,
        },
        createApiKey: mockCreateApiKey,
        deleteApiKey: mockDeleteApiKey,
        clearCreatedKey: mockClearCreatedKey,
      });

      render(<ApiKeys />);

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);

      expect(mockClearCreatedKey).toHaveBeenCalled();
    });
  });

  describe('Delete API Key', () => {
    it('shows confirmation when revoke is clicked', () => {
      render(<ApiKeys />);

      const revokeButtons = screen.getAllByRole('button', { name: /^revoke$/i });
      fireEvent.click(revokeButtons[0]);

      expect(screen.getByText(/revoke\?/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });

    it('deletes key when confirmed', async () => {
      mockDeleteApiKey.mockResolvedValueOnce(undefined);

      render(<ApiKeys />);

      const revokeButtons = screen.getAllByRole('button', { name: /^revoke$/i });
      fireEvent.click(revokeButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteApiKey).toHaveBeenCalledWith('key_1');
      });
    });

    it('cancels delete when cancel is clicked', () => {
      render(<ApiKeys />);

      const revokeButtons = screen.getAllByRole('button', { name: /^revoke$/i });
      fireEvent.click(revokeButtons[0]);

      const cancelButton = screen.getAllByRole('button', { name: /cancel/i })[0];
      fireEvent.click(cancelButton);

      expect(screen.queryByText(/revoke\?/i)).not.toBeInTheDocument();
    });
  });
});
