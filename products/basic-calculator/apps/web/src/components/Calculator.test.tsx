import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Calculator } from './Calculator';

describe('Calculator', () => {
  it('should render calculator with initial state', () => {
    render(<Calculator />);
    expect(screen.getByTestId('calculator-display')).toHaveTextContent('0');
  });

  it('should input single digit', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByLabelText('Five'));
    expect(screen.getByTestId('calculator-display')).toHaveTextContent('5');
  });

  it('should input multiple digits', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByLabelText('Five'));
    await user.click(screen.getByLabelText('Three'));
    await user.click(screen.getByLabelText('Seven'));
    expect(screen.getByTestId('calculator-display')).toHaveTextContent('537');
  });

  it('should calculate 5 + 3 = 8', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByLabelText('Five'));
    await user.click(screen.getByLabelText('Plus'));
    await user.click(screen.getByLabelText('Three'));
    await user.click(screen.getByLabelText('Equals'));

    expect(screen.getByTestId('calculator-display')).toHaveTextContent('8');
  });

  it('should calculate 10 - 4 = 6', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByLabelText('One'));
    await user.click(screen.getByLabelText('Zero'));
    await user.click(screen.getByLabelText('Minus'));
    await user.click(screen.getByLabelText('Four'));
    await user.click(screen.getByLabelText('Equals'));

    expect(screen.getByTestId('calculator-display')).toHaveTextContent('6');
  });

  it('should calculate 7 * 6 = 42', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByLabelText('Seven'));
    await user.click(screen.getByLabelText('Multiply'));
    await user.click(screen.getByLabelText('Six'));
    await user.click(screen.getByLabelText('Equals'));

    expect(screen.getByTestId('calculator-display')).toHaveTextContent('42');
  });

  it('should calculate 15 / 3 = 5', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByLabelText('One'));
    await user.click(screen.getByLabelText('Five'));
    await user.click(screen.getByLabelText('Divide'));
    await user.click(screen.getByLabelText('Three'));
    await user.click(screen.getByLabelText('Equals'));

    expect(screen.getByTestId('calculator-display')).toHaveTextContent('5');
  });

  it('should handle decimal input', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByLabelText('Three'));
    await user.click(screen.getByLabelText('Decimal point'));
    await user.click(screen.getByLabelText('One'));
    await user.click(screen.getByLabelText('Four'));

    expect(screen.getByTestId('calculator-display')).toHaveTextContent('3.14');
  });

  it('should calculate with decimals: 0.1 + 0.2 = 0.3', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByLabelText('Zero'));
    await user.click(screen.getByLabelText('Decimal point'));
    await user.click(screen.getByLabelText('One'));
    await user.click(screen.getByLabelText('Plus'));
    await user.click(screen.getByLabelText('Zero'));
    await user.click(screen.getByLabelText('Decimal point'));
    await user.click(screen.getByLabelText('Two'));
    await user.click(screen.getByLabelText('Equals'));

    expect(screen.getByTestId('calculator-display')).toHaveTextContent('0.3');
  });

  it('should clear display with C button', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByLabelText('Five'));
    await user.click(screen.getByLabelText('Three'));
    await user.click(screen.getByLabelText('Clear'));

    expect(screen.getByTestId('calculator-display')).toHaveTextContent('0');
  });

  it('should display error on division by zero', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByLabelText('Five'));
    await user.click(screen.getByLabelText('Divide'));
    await user.click(screen.getByLabelText('Zero'));
    await user.click(screen.getByLabelText('Equals'));

    expect(screen.getByTestId('calculator-display')).toHaveTextContent('Error: Cannot divide by zero');
  });

  it('should recover from error on number input', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByLabelText('Five'));
    await user.click(screen.getByLabelText('Divide'));
    await user.click(screen.getByLabelText('Zero'));
    await user.click(screen.getByLabelText('Equals'));

    // Error displayed
    expect(screen.getByTestId('calculator-display')).toHaveTextContent('Error');

    // Press a number to recover
    await user.click(screen.getByLabelText('Three'));
    expect(screen.getByTestId('calculator-display')).toHaveTextContent('3');
  });

  it('should support keyboard input for numbers', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.keyboard('537');
    expect(screen.getByTestId('calculator-display')).toHaveTextContent('537');
  });

  it('should support keyboard input for calculation', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.keyboard('5+3');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('calculator-display')).toHaveTextContent('8');
  });

  it('should support keyboard Escape to clear', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.keyboard('537');
    await user.keyboard('{Escape}');
    expect(screen.getByTestId('calculator-display')).toHaveTextContent('0');
  });

  it('should chain operations: 5 + 3 - 2 = 6', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByLabelText('Five'));
    await user.click(screen.getByLabelText('Plus'));
    await user.click(screen.getByLabelText('Three'));
    await user.click(screen.getByLabelText('Minus')); // Should calculate 5+3=8, then set operation to minus
    await user.click(screen.getByLabelText('Two'));
    await user.click(screen.getByLabelText('Equals'));

    expect(screen.getByTestId('calculator-display')).toHaveTextContent('6');
  });
});
