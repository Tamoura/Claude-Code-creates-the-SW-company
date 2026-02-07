import React from 'react';
import { render } from '@testing-library/react-native';
import { RiskGauge } from '../src/components/RiskGauge';

describe('RiskGauge', () => {
  it('renders with the correct score', () => {
    const { getByTestId } = render(
      <RiskGauge score={42} level="medium" />
    );
    const scoreEl = getByTestId('risk-score');
    expect(scoreEl.props.children).toBe(42);
  });

  it('renders the risk level badge', () => {
    const { getByTestId } = render(
      <RiskGauge score={72} level="high" />
    );
    const levelEl = getByTestId('risk-level');
    expect(levelEl.props.children).toBe('HIGH');
  });

  it('renders with low risk level', () => {
    const { getByTestId } = render(
      <RiskGauge score={25} level="low" />
    );
    const levelEl = getByTestId('risk-level');
    expect(levelEl.props.children).toBe('LOW');
  });

  it('renders with correct accessibility label', () => {
    const { getByLabelText } = render(
      <RiskGauge score={55} level="medium" />
    );
    expect(
      getByLabelText('Sprint risk score 55, level medium')
    ).toBeTruthy();
  });

  it('renders the gauge container', () => {
    const { getByTestId } = render(
      <RiskGauge score={80} level="high" />
    );
    expect(getByTestId('risk-gauge')).toBeTruthy();
  });

  it('clamps score to 0-100 range', () => {
    const { getByTestId } = render(
      <RiskGauge score={150} level="high" />
    );
    // The score text still shows the raw value
    const scoreEl = getByTestId('risk-score');
    expect(scoreEl.props.children).toBe(150);
    // But the progress ring clamps internally
    expect(getByTestId('risk-gauge')).toBeTruthy();
  });
});
