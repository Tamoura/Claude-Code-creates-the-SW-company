import { render, screen } from '@testing-library/react';
import TeamMemberPage from '../src/app/dashboard/team/[id]/page';

describe('Team Member Page', () => {
  const defaultParams = { id: 'team-1' };

  it('renders the team name heading', () => {
    render(<TeamMemberPage params={defaultParams} />);
    expect(screen.getByText('Frontend Squad')).toBeInTheDocument();
  });

  it('renders the team description', () => {
    render(<TeamMemberPage params={defaultParams} />);
    expect(screen.getByText(/team overview and member metrics/i)).toBeInTheDocument();
  });

  it('renders team stat cards', () => {
    render(<TeamMemberPage params={defaultParams} />);
    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('PRs This Week')).toBeInTheDocument();
    expect(screen.getByText('Avg Cycle Time')).toBeInTheDocument();
  });

  it('renders team members list', () => {
    render(<TeamMemberPage params={defaultParams} />);
    expect(screen.getByText('Team Members')).toBeInTheDocument();
  });

  it('renders individual member names', () => {
    render(<TeamMemberPage params={defaultParams} />);
    const members = screen.getAllByTestId('member-row');
    expect(members.length).toBeGreaterThanOrEqual(3);
  });

  it('renders member contribution metrics', () => {
    render(<TeamMemberPage params={defaultParams} />);
    const contributions = screen.getAllByTestId('member-prs');
    expect(contributions.length).toBeGreaterThanOrEqual(3);
  });

  it('renders a back link to teams', () => {
    render(<TeamMemberPage params={defaultParams} />);
    const link = screen.getByRole('link', { name: /back to teams/i });
    expect(link).toHaveAttribute('href', '/dashboard/team');
  });

  it('renders fallback for unknown team', () => {
    render(<TeamMemberPage params={{ id: 'unknown-id' }} />);
    expect(screen.getByText(/team not found/i)).toBeInTheDocument();
  });
});
