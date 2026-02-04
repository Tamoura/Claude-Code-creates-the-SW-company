import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SseStatusBadge from './SseStatusBadge';

describe('SseStatusBadge', () => {
  it('shows "Live" with green dot when connected', () => {
    render(<SseStatusBadge state="connected" />);

    expect(screen.getByText('Live')).toBeInTheDocument();
    const badge = screen.getByText('Live').closest('div');
    expect(badge).toHaveClass('text-accent-green');
  });

  it('shows "Connecting..." when connecting', () => {
    render(<SseStatusBadge state="connecting" />);

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    const badge = screen.getByText('Connecting...').closest('div');
    expect(badge).toHaveClass('text-accent-yellow');
  });

  it('shows "Disconnected" when in error state', () => {
    render(<SseStatusBadge state="error" />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    const badge = screen.getByText('Disconnected').closest('div');
    expect(badge).toHaveClass('text-red-400');
  });

  it('shows "Offline" when disconnected', () => {
    render(<SseStatusBadge state="disconnected" />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
    const badge = screen.getByText('Offline').closest('div');
    expect(badge).toHaveClass('text-text-muted');
  });
});
