import { render, screen, fireEvent } from '@testing-library/react';
import TeamPage from '../src/app/dashboard/team/page';

describe('Team Page', () => {
  it('renders the page heading', () => {
    render(<TeamPage />);
    expect(screen.getByText('Teams')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<TeamPage />);
    expect(
      screen.getByText(/teams you belong to and their activity/i)
    ).toBeInTheDocument();
  });

  it('renders team cards', () => {
    render(<TeamPage />);
    const teamCards = screen.getAllByTestId('team-card');
    expect(teamCards.length).toBeGreaterThanOrEqual(2);
  });

  it('renders team names', () => {
    render(<TeamPage />);
    expect(screen.getByText('Frontend Squad')).toBeInTheDocument();
    expect(screen.getByText('Backend Core')).toBeInTheDocument();
  });

  it('renders member counts', () => {
    render(<TeamPage />);
    expect(screen.getByText(/5 members/i)).toBeInTheDocument();
    expect(screen.getByText(/4 members/i)).toBeInTheDocument();
  });

  it('renders activity summaries', () => {
    render(<TeamPage />);
    const summaries = screen.getAllByTestId('team-activity');
    expect(summaries.length).toBeGreaterThanOrEqual(2);
  });

  it('renders create team section', () => {
    render(<TeamPage />);
    expect(screen.getByText('Create Team')).toBeInTheDocument();
  });

  it('renders team name input', () => {
    render(<TeamPage />);
    expect(screen.getByPlaceholderText('Team name')).toBeInTheDocument();
  });

  it('renders create button', () => {
    render(<TeamPage />);
    expect(
      screen.getByRole('button', { name: /create/i })
    ).toBeInTheDocument();
  });

  it('renders links to team detail pages', () => {
    render(<TeamPage />);
    const teamLinks = screen.getAllByTestId('team-link');
    expect(teamLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('team links point to correct URLs', () => {
    render(<TeamPage />);
    const teamLinks = screen.getAllByTestId('team-link');
    expect(teamLinks[0]).toHaveAttribute('href', expect.stringContaining('/dashboard/team/'));
  });
});
