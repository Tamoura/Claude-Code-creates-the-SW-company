import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render button with value', () => {
    render(<Button value="5" onClick={() => {}} ariaLabel="Five" variant="number" />);
    expect(screen.getByRole('button', { name: 'Five' })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button value="5" onClick={handleClick} ariaLabel="Five" variant="number" />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply number variant styling', () => {
    render(<Button value="5" onClick={() => {}} ariaLabel="Five" variant="number" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-calc-btn-number');
  });

  it('should apply operator variant styling', () => {
    render(<Button value="+" onClick={() => {}} ariaLabel="Plus" variant="operator" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-calc-btn-operator');
  });

  it('should apply equals variant styling', () => {
    render(<Button value="=" onClick={() => {}} ariaLabel="Equals" variant="equals" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-calc-btn-equals');
  });

  it('should apply clear variant styling', () => {
    render(<Button value="C" onClick={() => {}} ariaLabel="Clear" variant="clear" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-calc-btn-clear');
  });

  it('should have accessible aria-label', () => {
    render(<Button value="7" onClick={() => {}} ariaLabel="Seven" variant="number" />);
    expect(screen.getByLabelText('Seven')).toBeInTheDocument();
  });

  it('should have focus styles', () => {
    render(<Button value="5" onClick={() => {}} ariaLabel="Five" variant="number" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('focus:ring-4');
  });

  it('should have minimum touch target size', () => {
    render(<Button value="5" onClick={() => {}} ariaLabel="Five" variant="number" />);
    const button = screen.getByRole('button');
    // Check for responsive sizing classes (56px minimum on mobile)
    expect(button).toHaveClass('w-14', 'h-14');
  });
});
