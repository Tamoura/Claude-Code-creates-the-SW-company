import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Webhooks from './Webhooks';
import * as useWebhooksModule from '../../hooks/useWebhooks';

// Mock the useWebhooks hook but preserve WEBHOOK_EVENTS constant
vi.mock('../../hooks/useWebhooks', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../hooks/useWebhooks')>();
  return {
    ...original,
    useWebhooks: vi.fn(),
  };
});

describe('Webhooks Page', () => {
  const mockWebhooks = [
    {
      id: 'wh_1',
      url: 'https://example.com/webhooks/stableflow',
      description: 'Production webhook',
      events: ['payment.completed', 'payment.failed'],
      enabled: true,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'wh_2',
      url: 'https://dev.example.com/webhooks',
      description: null,
      events: ['payment.created', 'refund.completed'],
      enabled: false,
      created_at: '2024-01-10T08:00:00Z',
      updated_at: '2024-01-10T08:00:00Z',
    },
  ];

  const mockCreateWebhook = vi.fn();
  const mockUpdateWebhook = vi.fn();
  const mockDeleteWebhook = vi.fn();
  const mockRotateSecret = vi.fn();
  const mockClearCreatedWebhook = vi.fn();
  const mockClearRotatedSecret = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    vi.spyOn(useWebhooksModule, 'useWebhooks').mockReturnValue({
      webhooks: mockWebhooks,
      isLoading: false,
      error: null,
      createdWebhook: null,
      rotatedSecret: null,
      createWebhook: mockCreateWebhook,
      updateWebhook: mockUpdateWebhook,
      deleteWebhook: mockDeleteWebhook,
      rotateSecret: mockRotateSecret,
      clearCreatedWebhook: mockClearCreatedWebhook,
      clearRotatedSecret: mockClearRotatedSecret,
    });
  });

  describe('Rendering', () => {
    it('renders page title and description', () => {
      render(<Webhooks />);

      expect(screen.getByText('Webhooks')).toBeInTheDocument();
      expect(screen.getByText(/configure endpoints to receive real-time payment notifications/i)).toBeInTheDocument();
    });

    it('renders add webhook button', () => {
      render(<Webhooks />);

      expect(screen.getByRole('button', { name: /add webhook/i })).toBeInTheDocument();
    });

    it('renders webhooks list with URLs', () => {
      render(<Webhooks />);

      expect(screen.getByText('https://example.com/webhooks/stableflow')).toBeInTheDocument();
      expect(screen.getByText('https://dev.example.com/webhooks')).toBeInTheDocument();
    });

    it('displays webhook events as badges', () => {
      render(<Webhooks />);

      expect(screen.getByText('payment.completed')).toBeInTheDocument();
      expect(screen.getByText('payment.failed')).toBeInTheDocument();
      expect(screen.getByText('payment.created')).toBeInTheDocument();
      expect(screen.getByText('refund.completed')).toBeInTheDocument();
    });

    it('shows active/disabled status badges', () => {
      render(<Webhooks />);

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    it('renders action buttons for each webhook', () => {
      render(<Webhooks />);

      const enableButtons = screen.getAllByRole('button', { name: /enable|disable/i });
      expect(enableButtons.length).toBeGreaterThan(0);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      expect(editButtons.length).toBeGreaterThan(0);

      const rotateButtons = screen.getAllByRole('button', { name: /rotate secret/i });
      expect(rotateButtons.length).toBeGreaterThan(0);

      const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('shows description when provided', () => {
      render(<Webhooks />);

      expect(screen.getByText('Production webhook')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no webhooks exist', () => {
      vi.spyOn(useWebhooksModule, 'useWebhooks').mockReturnValue({
        webhooks: [],
        isLoading: false,
        error: null,
        createdWebhook: null,
        rotatedSecret: null,
        createWebhook: mockCreateWebhook,
        updateWebhook: mockUpdateWebhook,
        deleteWebhook: mockDeleteWebhook,
        rotateSecret: mockRotateSecret,
        clearCreatedWebhook: mockClearCreatedWebhook,
        clearRotatedSecret: mockClearRotatedSecret,
      });

      render(<Webhooks />);

      expect(screen.getByText(/no webhooks configured/i)).toBeInTheDocument();
    });

    it('shows loading state', () => {
      vi.spyOn(useWebhooksModule, 'useWebhooks').mockReturnValue({
        webhooks: [],
        isLoading: true,
        error: null,
        createdWebhook: null,
        rotatedSecret: null,
        createWebhook: mockCreateWebhook,
        updateWebhook: mockUpdateWebhook,
        deleteWebhook: mockDeleteWebhook,
        rotateSecret: mockRotateSecret,
        clearCreatedWebhook: mockClearCreatedWebhook,
        clearRotatedSecret: mockClearRotatedSecret,
      });

      render(<Webhooks />);

      expect(screen.getByText(/loading webhooks/i)).toBeInTheDocument();
    });

    it('shows error message when error occurs', () => {
      vi.spyOn(useWebhooksModule, 'useWebhooks').mockReturnValue({
        webhooks: [],
        isLoading: false,
        error: 'Failed to load webhooks',
        createdWebhook: null,
        rotatedSecret: null,
        createWebhook: mockCreateWebhook,
        updateWebhook: mockUpdateWebhook,
        deleteWebhook: mockDeleteWebhook,
        rotateSecret: mockRotateSecret,
        clearCreatedWebhook: mockClearCreatedWebhook,
        clearRotatedSecret: mockClearRotatedSecret,
      });

      render(<Webhooks />);

      expect(screen.getByText('Failed to load webhooks')).toBeInTheDocument();
    });
  });

  describe('Create Webhook Form', () => {
    it('shows form when add webhook button is clicked', () => {
      render(<Webhooks />);

      const addButton = screen.getByRole('button', { name: /add webhook/i });
      fireEvent.click(addButton);

      expect(screen.getByLabelText(/endpoint url/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByText(/events/i)).toBeInTheDocument();
    });

    it('renders event checkboxes in form', () => {
      render(<Webhooks />);

      const addButton = screen.getByRole('button', { name: /add webhook/i });
      fireEvent.click(addButton);

      // Checkboxes render for each WEBHOOK_EVENT
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThanOrEqual(8);
    });

    it('submits form with correct data', async () => {
      mockCreateWebhook.mockResolvedValueOnce(undefined);

      render(<Webhooks />);

      const addButton = screen.getByRole('button', { name: /add webhook/i });
      fireEvent.click(addButton);

      const urlInput = screen.getByLabelText(/endpoint url/i);
      fireEvent.change(urlInput, { target: { value: 'https://test.com/webhook' } });

      const descInput = screen.getByLabelText(/description/i);
      fireEvent.change(descInput, { target: { value: 'Test webhook' } });

      // Wait for checkboxes to render and click the first one
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
        fireEvent.click(checkboxes[0]);
      });

      const submitButton = screen.getByRole('button', { name: /create webhook/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateWebhook).toHaveBeenCalled();
      });
    });

    it('cancels form when cancel button is clicked', () => {
      render(<Webhooks />);

      const addButton = screen.getByRole('button', { name: /add webhook/i });
      fireEvent.click(addButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByLabelText(/endpoint url/i)).not.toBeInTheDocument();
    });
  });

  describe('Edit Webhook', () => {
    it('shows edit form when edit button is clicked', () => {
      render(<Webhooks />);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);

      // URL input should be visible in edit mode
      const urlInputs = screen.getAllByDisplayValue('https://example.com/webhooks/stableflow');
      expect(urlInputs.length).toBeGreaterThan(0);
    });

    it('saves changes when save button is clicked', async () => {
      mockUpdateWebhook.mockResolvedValueOnce({
        ...mockWebhooks[0],
        url: 'https://updated.com/webhook',
      });

      render(<Webhooks />);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);

      const urlInput = screen.getByDisplayValue('https://example.com/webhooks/stableflow');
      fireEvent.change(urlInput, { target: { value: 'https://updated.com/webhook' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateWebhook).toHaveBeenCalledWith('wh_1', expect.any(Object));
      });
    });

    it('cancels edit when cancel is clicked', () => {
      render(<Webhooks />);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);

      const cancelButton = screen.getAllByRole('button', { name: /cancel/i })[0];
      fireEvent.click(cancelButton);

      // Should return to view mode
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });
  });

  describe('Webhook Actions', () => {
    it('toggles webhook enabled status', async () => {
      mockUpdateWebhook.mockResolvedValueOnce({
        ...mockWebhooks[0],
        enabled: false,
      });

      render(<Webhooks />);

      const disableButton = screen.getByRole('button', { name: /disable/i });
      fireEvent.click(disableButton);

      await waitFor(() => {
        expect(mockUpdateWebhook).toHaveBeenCalledWith('wh_1', { enabled: false });
      });
    });

    it('rotates webhook secret', async () => {
      mockRotateSecret.mockResolvedValueOnce(undefined);

      render(<Webhooks />);

      const rotateButtons = screen.getAllByRole('button', { name: /rotate secret/i });
      fireEvent.click(rotateButtons[0]);

      await waitFor(() => {
        expect(mockRotateSecret).toHaveBeenCalledWith('wh_1');
      });
    });

    it('shows delete confirmation', () => {
      render(<Webhooks />);

      const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText(/delete\?/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });

    it('deletes webhook when confirmed', async () => {
      mockDeleteWebhook.mockResolvedValueOnce(undefined);

      render(<Webhooks />);

      const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteWebhook).toHaveBeenCalledWith('wh_1');
      });
    });
  });

  describe('Secret Banner', () => {
    it('shows created webhook secret banner', () => {
      vi.spyOn(useWebhooksModule, 'useWebhooks').mockReturnValue({
        webhooks: mockWebhooks,
        isLoading: false,
        error: null,
        createdWebhook: {
          ...mockWebhooks[0],
          secret: 'whsec_test_secret_12345',
        },
        rotatedSecret: null,
        createWebhook: mockCreateWebhook,
        updateWebhook: mockUpdateWebhook,
        deleteWebhook: mockDeleteWebhook,
        rotateSecret: mockRotateSecret,
        clearCreatedWebhook: mockClearCreatedWebhook,
        clearRotatedSecret: mockClearRotatedSecret,
      });

      render(<Webhooks />);

      expect(screen.getByText(/webhook created/i)).toBeInTheDocument();
      expect(screen.getByText('whsec_test_secret_12345')).toBeInTheDocument();
    });

    it('shows rotated secret banner', () => {
      vi.spyOn(useWebhooksModule, 'useWebhooks').mockReturnValue({
        webhooks: mockWebhooks,
        isLoading: false,
        error: null,
        createdWebhook: null,
        rotatedSecret: 'whsec_rotated_secret_67890',
        createWebhook: mockCreateWebhook,
        updateWebhook: mockUpdateWebhook,
        deleteWebhook: mockDeleteWebhook,
        rotateSecret: mockRotateSecret,
        clearCreatedWebhook: mockClearCreatedWebhook,
        clearRotatedSecret: mockClearRotatedSecret,
      });

      render(<Webhooks />);

      expect(screen.getByText(/secret rotated/i)).toBeInTheDocument();
      expect(screen.getByText('whsec_rotated_secret_67890')).toBeInTheDocument();
    });

    it('allows copying the secret', async () => {
      const mockWriteText = vi.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      vi.spyOn(useWebhooksModule, 'useWebhooks').mockReturnValue({
        webhooks: mockWebhooks,
        isLoading: false,
        error: null,
        createdWebhook: {
          ...mockWebhooks[0],
          secret: 'whsec_test_secret',
        },
        rotatedSecret: null,
        createWebhook: mockCreateWebhook,
        updateWebhook: mockUpdateWebhook,
        deleteWebhook: mockDeleteWebhook,
        rotateSecret: mockRotateSecret,
        clearCreatedWebhook: mockClearCreatedWebhook,
        clearRotatedSecret: mockClearRotatedSecret,
      });

      render(<Webhooks />);

      const copyButton = screen.getByRole('button', { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('whsec_test_secret');
      });
    });

    it('dismisses secret banner', () => {
      vi.spyOn(useWebhooksModule, 'useWebhooks').mockReturnValue({
        webhooks: mockWebhooks,
        isLoading: false,
        error: null,
        createdWebhook: {
          ...mockWebhooks[0],
          secret: 'whsec_test_secret',
        },
        rotatedSecret: null,
        createWebhook: mockCreateWebhook,
        updateWebhook: mockUpdateWebhook,
        deleteWebhook: mockDeleteWebhook,
        rotateSecret: mockRotateSecret,
        clearCreatedWebhook: mockClearCreatedWebhook,
        clearRotatedSecret: mockClearRotatedSecret,
      });

      render(<Webhooks />);

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);

      expect(mockClearCreatedWebhook).toHaveBeenCalled();
      expect(mockClearRotatedSecret).toHaveBeenCalled();
    });
  });
});
