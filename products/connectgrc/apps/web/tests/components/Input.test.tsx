import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from '../../src/components/ui/Input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with a label when provided', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('associates label with input via htmlFor/id', () => {
    render(<Input label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'email');
  });

  it('uses custom id when provided', () => {
    render(<Input label="Email" id="custom-email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'custom-email');
  });

  it('shows error message when error prop is provided', () => {
    render(<Input label="Email" error="Email is required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
  });

  it('sets aria-invalid when error is present', () => {
    render(<Input label="Email" error="Invalid email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows helper text when provided and no error', () => {
    render(<Input label="Email" helperText="Enter your work email" />);
    expect(screen.getByText('Enter your work email')).toBeInTheDocument();
  });

  it('does not show helper text when error is present', () => {
    render(
      <Input
        label="Email"
        error="Required"
        helperText="Enter your work email"
      />
    );
    expect(screen.queryByText('Enter your work email')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('applies error border styling when error is present', () => {
    render(<Input label="Email" error="Required" />);
    const input = screen.getByLabelText('Email');
    expect(input.className).toContain('border-red-500');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} placeholder="test" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('handles onChange events', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} placeholder="Type here" />);
    fireEvent.change(screen.getByPlaceholderText('Type here'), {
      target: { value: 'hello' },
    });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });
});
