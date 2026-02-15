import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageToggle } from '@/components/LanguageToggle';

describe('LanguageToggle', () => {
  it('renders English and Arabic buttons', () => {
    const onToggle = jest.fn();
    render(<LanguageToggle activeLanguage="en" onToggle={onToggle} />);
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('العربية')).toBeInTheDocument();
  });

  it('calls onToggle with "ar" when Arabic button is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(<LanguageToggle activeLanguage="en" onToggle={onToggle} />);

    await user.click(screen.getByText('العربية'));
    expect(onToggle).toHaveBeenCalledWith('ar');
  });

  it('calls onToggle with "en" when English button is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(<LanguageToggle activeLanguage="ar" onToggle={onToggle} />);

    await user.click(screen.getByText('English'));
    expect(onToggle).toHaveBeenCalledWith('en');
  });

  it('applies active styling to English button when activeLanguage is "en"', () => {
    const onToggle = jest.fn();
    render(<LanguageToggle activeLanguage="en" onToggle={onToggle} />);

    const englishButton = screen.getByText('English');
    expect(englishButton).toHaveClass('bg-blue-600', 'text-white');
  });

  it('applies active styling to Arabic button when activeLanguage is "ar"', () => {
    const onToggle = jest.fn();
    render(<LanguageToggle activeLanguage="ar" onToggle={onToggle} />);

    const arabicButton = screen.getByText('العربية');
    expect(arabicButton).toHaveClass('bg-blue-600', 'text-white');
  });

  it('does not apply active styling to inactive button', () => {
    const onToggle = jest.fn();
    render(<LanguageToggle activeLanguage="en" onToggle={onToggle} />);

    const arabicButton = screen.getByText('العربية');
    expect(arabicButton).not.toHaveClass('bg-blue-600');
    expect(arabicButton).toHaveClass('text-gray-400');
  });
});
