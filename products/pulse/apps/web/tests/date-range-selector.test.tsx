import { render, screen, fireEvent } from '@testing-library/react';
import DateRangeSelector from '../src/components/common/DateRangeSelector';

describe('DateRangeSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders all preset range buttons', () => {
    render(<DateRangeSelector value="7d" onChange={mockOnChange} />);
    expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '90d' })).toBeInTheDocument();
  });

  it('highlights the currently selected range', () => {
    render(<DateRangeSelector value="30d" onChange={mockOnChange} />);
    const activeBtn = screen.getByRole('button', { name: '30d' });
    expect(activeBtn.className).toContain('bg-indigo-600');
  });

  it('does not highlight non-selected ranges', () => {
    render(<DateRangeSelector value="7d" onChange={mockOnChange} />);
    const inactiveBtn = screen.getByRole('button', { name: '30d' });
    expect(inactiveBtn.className).not.toContain('bg-indigo-600');
  });

  it('calls onChange when a range button is clicked', () => {
    render(<DateRangeSelector value="7d" onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole('button', { name: '30d' }));
    expect(mockOnChange).toHaveBeenCalledWith('30d');
  });

  it('calls onChange with correct value for each button', () => {
    render(<DateRangeSelector value="7d" onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole('button', { name: '90d' }));
    expect(mockOnChange).toHaveBeenCalledWith('90d');
  });
});
