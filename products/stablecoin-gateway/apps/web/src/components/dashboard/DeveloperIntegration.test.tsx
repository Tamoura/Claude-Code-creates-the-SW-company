import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import DeveloperIntegration from './DeveloperIntegration';

describe('DeveloperIntegration', () => {
  it('renders the section heading', () => {
    render(<DeveloperIntegration />);

    expect(
      screen.getByRole('heading', { name: /developer integration/i })
    ).toBeInTheDocument();
  });

  it('renders the REST API badge', () => {
    render(<DeveloperIntegration />);

    expect(screen.getByText('REST API')).toBeInTheDocument();
  });

  it('renders code snippet with syntax elements', () => {
    render(<DeveloperIntegration />);

    expect(screen.getByText('const')).toBeInTheDocument();
    expect(screen.getByText("'stableflow'")).toBeInTheDocument();
    expect(screen.getByText(/paymentIntents/)).toBeInTheDocument();
  });

  it('renders Live API Key label and key value', () => {
    render(<DeveloperIntegration />);

    expect(screen.getByText('Live API Key')).toBeInTheDocument();
    expect(screen.getByText('pk_live_51MzQ2...k9J2s')).toBeInTheDocument();
  });

  it('renders two Copy buttons initially', () => {
    render(<DeveloperIntegration />);

    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    expect(copyButtons).toHaveLength(2);
  });

  it('shows Copied! feedback when code copy button is clicked', async () => {
    const user = userEvent.setup();
    render(<DeveloperIntegration />);

    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    await user.click(copyButtons[0]);

    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('shows Copied! feedback when API key copy button is clicked', async () => {
    const user = userEvent.setup();
    render(<DeveloperIntegration />);

    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    await user.click(copyButtons[1]);

    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });
});
