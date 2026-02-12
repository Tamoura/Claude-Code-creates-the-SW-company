import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MilestoneCelebration from '../../src/components/dashboard/MilestoneCelebration';

describe('MilestoneCelebration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <MilestoneCelebration
        visible={false}
        milestoneName="Can count to 10"
        dimensionName="Academic"
        onClose={jest.fn()}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows milestone name when visible', () => {
    render(
      <MilestoneCelebration
        visible={true}
        milestoneName="Can count to 10"
        dimensionName="Academic"
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText(/Can count to 10 has been achieved!/)).toBeInTheDocument();
  });

  it('shows dimension name', () => {
    render(
      <MilestoneCelebration
        visible={true}
        milestoneName="Can count to 10"
        dimensionName="Academic"
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText(/Academic/)).toBeInTheDocument();
  });

  it('shows share achievement button', () => {
    render(
      <MilestoneCelebration
        visible={true}
        milestoneName="Can count to 10"
        dimensionName="Academic"
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('Share Achievement')).toBeInTheDocument();
  });

  it('copies text to clipboard when share button is clicked', async () => {
    render(
      <MilestoneCelebration
        visible={true}
        milestoneName="Can count to 10"
        dimensionName="Academic"
        onClose={jest.fn()}
      />
    );

    const shareBtn = screen.getByText('Share Achievement');
    await act(async () => {
      fireEvent.click(shareBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('Can count to 10')
    );
  });

  it('shows copied confirmation after share', async () => {
    render(
      <MilestoneCelebration
        visible={true}
        milestoneName="Can count to 10"
        dimensionName="Academic"
        onClose={jest.fn()}
      />
    );

    const shareBtn = screen.getByText('Share Achievement');
    await act(async () => {
      fireEvent.click(shareBtn);
    });

    expect(screen.getByText('Copied to clipboard!')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <MilestoneCelebration
        visible={true}
        milestoneName="Can count to 10"
        dimensionName="Academic"
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByText('Close');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders celebration animation container', () => {
    render(
      <MilestoneCelebration
        visible={true}
        milestoneName="Can count to 10"
        dimensionName="Academic"
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('celebration-animation')).toBeInTheDocument();
  });
});
