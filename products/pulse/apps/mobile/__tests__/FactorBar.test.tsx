import React from 'react';
import { render } from '@testing-library/react-native';
import { FactorBar } from '../src/components/FactorBar';

describe('FactorBar', () => {
  it('renders the factor name', () => {
    const { getByText } = render(
      <FactorBar
        name="Velocity Trend"
        score={65}
        detail="Below sprint average pace"
      />
    );
    expect(getByText('Velocity Trend')).toBeTruthy();
  });

  it('renders the factor score', () => {
    const { getByText } = render(
      <FactorBar
        name="PR Backlog"
        score={80}
        detail="5 PRs waiting >24h"
      />
    );
    expect(getByText('80')).toBeTruthy();
  });

  it('renders the factor detail', () => {
    const { getByText } = render(
      <FactorBar
        name="Coverage"
        score={30}
        detail="Coverage holding steady"
      />
    );
    expect(getByText('Coverage holding steady')).toBeTruthy();
  });

  it('renders with correct testID', () => {
    const { getByTestId } = render(
      <FactorBar
        name="Test Factor"
        score={50}
        detail="Test detail"
      />
    );
    expect(getByTestId('factor-Test Factor')).toBeTruthy();
  });
});
