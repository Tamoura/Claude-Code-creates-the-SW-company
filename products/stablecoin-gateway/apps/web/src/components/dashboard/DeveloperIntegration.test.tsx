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

  it('renders API Key label with masked placeholder', () => {
    render(<DeveloperIntegration />);

    expect(screen.getByText('API Key')).toBeInTheDocument();
    expect(screen.getByText(/sk_live_/)).toBeInTheDocument();
  });

  it('renders Manage Keys link instead of copy button for API key', () => {
    render(<DeveloperIntegration />);

    expect(screen.getByRole('link', { name: /manage keys/i })).toHaveAttribute(
      'href',
      '/dashboard/api-keys'
    );
  });

  it('renders one Copy button for code snippet', () => {
    render(<DeveloperIntegration />);

    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    expect(copyButtons).toHaveLength(1);
  });

  it('shows Copied! feedback when code copy button is clicked', async () => {
    const user = userEvent.setup();
    render(<DeveloperIntegration />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    await user.click(copyButton);

    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });
});
