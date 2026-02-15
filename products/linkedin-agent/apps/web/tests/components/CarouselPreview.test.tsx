import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CarouselPreview } from '@/components/CarouselPreview';

const slides = [
  {
    slideNumber: 1,
    title: 'Welcome',
    content: 'Introduction to the topic.',
    speakerNotes: 'Start with a hook.',
  },
  {
    slideNumber: 2,
    title: 'Key Points',
    content: 'The main arguments.',
  },
  {
    slideNumber: 3,
    title: 'Conclusion',
    content: 'Summary and call to action.',
    speakerNotes: 'End strong.',
  },
];

describe('CarouselPreview', () => {
  it('renders the first slide title and content by default', () => {
    render(<CarouselPreview slides={slides} />);
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('Introduction to the topic.')).toBeInTheDocument();
  });

  it('renders "No carousel slides available" when slides array is empty', () => {
    render(<CarouselPreview slides={[]} />);
    expect(screen.getByText('No carousel slides available')).toBeInTheDocument();
  });

  it('shows speaker notes when provided on the current slide', () => {
    render(<CarouselPreview slides={slides} />);
    expect(screen.getByText('Speaker Notes')).toBeInTheDocument();
    expect(screen.getByText('Start with a hook.')).toBeInTheDocument();
  });

  it('displays slide counter text', () => {
    render(<CarouselPreview slides={slides} />);
    expect(screen.getByText('Slide 1 of 3')).toBeInTheDocument();
  });

  it('renders the optional title when provided', () => {
    render(<CarouselPreview slides={slides} title="My Carousel" />);
    expect(screen.getByText('My Carousel')).toBeInTheDocument();
  });

  it('navigates to next slide on next button click', async () => {
    const user = userEvent.setup();
    render(<CarouselPreview slides={slides} />);

    // Find the next button (second navigation button)
    const buttons = screen.getAllByRole('button');
    // The last real navigation button is the "next" one (rightmost)
    const nextButton = buttons[buttons.length - 1];
    await user.click(nextButton);

    expect(screen.getByText('Key Points')).toBeInTheDocument();
    expect(screen.getByText('The main arguments.')).toBeInTheDocument();
    expect(screen.getByText('Slide 2 of 3')).toBeInTheDocument();
  });

  it('navigates to previous slide on prev button click', async () => {
    const user = userEvent.setup();
    render(<CarouselPreview slides={slides} />);

    // Navigate to slide 2 first
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1];
    await user.click(nextButton);
    expect(screen.getByText('Key Points')).toBeInTheDocument();

    // Now go back
    const prevButton = buttons[0];
    await user.click(prevButton);
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('Slide 1 of 3')).toBeInTheDocument();
  });

  it('disables prev button on first slide', () => {
    render(<CarouselPreview slides={slides} />);
    const buttons = screen.getAllByRole('button');
    const prevButton = buttons[0];
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last slide', async () => {
    const user = userEvent.setup();
    render(<CarouselPreview slides={slides} />);

    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1];

    // Navigate to last slide
    await user.click(nextButton);
    await user.click(nextButton);

    expect(screen.getByText('Conclusion')).toBeInTheDocument();
    // Re-query buttons after state changes
    const updatedButtons = screen.getAllByRole('button');
    const updatedNextButton = updatedButtons[updatedButtons.length - 1];
    expect(updatedNextButton).toBeDisabled();
  });

  it('does not show speaker notes when slide has none', async () => {
    const user = userEvent.setup();
    render(<CarouselPreview slides={slides} />);

    // Navigate to slide 2 which has no speaker notes
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1];
    await user.click(nextButton);

    expect(screen.getByText('Key Points')).toBeInTheDocument();
    expect(screen.queryByText('Speaker Notes')).not.toBeInTheDocument();
  });
});
