import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with a label when label prop is provided', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('generates id from label for accessibility', () => {
    render(<Input label="Full Name" />);
    const input = screen.getByLabelText('Full Name');
    expect(input.id).toBe('full-name');
  });

  it('uses provided id over generated one', () => {
    render(<Input label="Email" id="custom-id" />);
    const input = screen.getByLabelText('Email');
    expect(input.id).toBe('custom-id');
  });

  it('displays error message when error prop is set', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('applies error styling when error exists', () => {
    render(<Input error="Error" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-red-500');
  });

  it('renders with placeholder text', () => {
    render(<Input placeholder="Enter value" />);
    expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
  });

  it('accepts text input via typing', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);

    await user.type(screen.getByRole('textbox'), 'hello');
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders with type password', () => {
    render(<Input type="password" label="Password" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('renders as disabled', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Input className="bg-gray-50" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('bg-gray-50');
  });

  it('defaults to type text', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
  });
});
