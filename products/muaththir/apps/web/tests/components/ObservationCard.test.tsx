import { render, screen } from '@testing-library/react';
import ObservationCard from '../../src/components/dashboard/ObservationCard';
import type { Observation } from '../../src/components/dashboard/ObservationCard';

describe('ObservationCard', () => {
  const sampleObservation: Observation = {
    id: 'obs-1',
    dimension: 'academic',
    text: 'Completed multiplication tables up to 12. Confident and fast.',
    sentiment: 'positive',
    observedAt: '2026-02-07',
    tags: ['math', 'progress'],
  };

  it('renders the observation text', () => {
    render(<ObservationCard observation={sampleObservation} />);
    expect(
      screen.getByText(
        'Completed multiplication tables up to 12. Confident and fast.'
      )
    ).toBeInTheDocument();
  });

  it('renders the dimension badge', () => {
    render(<ObservationCard observation={sampleObservation} />);
    expect(screen.getByText('Academic')).toBeInTheDocument();
  });

  it('renders the sentiment label', () => {
    render(<ObservationCard observation={sampleObservation} />);
    expect(screen.getByText('Positive')).toBeInTheDocument();
  });

  it('renders needs_attention sentiment', () => {
    render(
      <ObservationCard
        observation={{
          ...sampleObservation,
          sentiment: 'needs_attention',
        }}
      />
    );
    expect(screen.getByText('Needs Attention')).toBeInTheDocument();
  });

  it('renders the formatted date', () => {
    render(<ObservationCard observation={sampleObservation} />);
    expect(screen.getByText('7 Feb 2026')).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<ObservationCard observation={sampleObservation} />);
    expect(screen.getByText('math')).toBeInTheDocument();
    expect(screen.getByText('progress')).toBeInTheDocument();
  });

  it('renders without tags', () => {
    render(
      <ObservationCard
        observation={{ ...sampleObservation, tags: undefined }}
      />
    );
    expect(
      screen.getByText(sampleObservation.text)
    ).toBeInTheDocument();
  });

  it('has accessible article role', () => {
    render(<ObservationCard observation={sampleObservation} />);
    expect(screen.getByRole('article')).toBeInTheDocument();
  });
});
