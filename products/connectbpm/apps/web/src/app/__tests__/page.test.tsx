import { render, screen } from '@testing-library/react';
import HomePage from '../page';

describe('HomePage', () => {
  it('renders the product name as the page heading', () => {
    render(<HomePage />);
    expect(
      screen.getByRole('heading', { name: 'ConnectBPM' })
    ).toBeInTheDocument();
  });

  it('shows the registered API URL', () => {
    render(<HomePage />);
    expect(screen.getByText(/5018/)).toBeInTheDocument();
  });
});
