import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CountdownTimer } from '../components/CountdownTimer';
import type { BlindStructure } from '../models/BlindStructure';

const baseStructure: BlindStructure = {
  name: 'Test Structure',
  description: 'A structure used for tests',
  levels: [
    { title: 'Level 1', initialSeconds: 3 * 60, smallBlind: 20, bigBlind: 10 },
    { title: 'Level 2', initialSeconds: 2 * 60, smallBlind: 40, bigBlind: 20 },
    { title: 'Level 3', initialSeconds: 60, smallBlind: 60, bigBlind: 30 },
  ],
};

function renderTimer(structure: BlindStructure = baseStructure) {
  return render(
    <MemoryRouter>
      <CountdownTimer structure={structure} />
    </MemoryRouter>,
  );
}

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('displays title, blinds, and hides the ante when it is 0', () => {
    renderTimer();

    expect(screen.getByRole('heading', { name: 'Level 1' })).toBeInTheDocument();
    expect(screen.getByText('Small Blind').nextSibling).toHaveTextContent('20');
    expect(screen.getByText('Big Blind').nextSibling).toHaveTextContent('10');
    expect(screen.queryByText('Ante')).not.toBeInTheDocument();
  });

  it('displays the ante when it is greater than 0', () => {
    const structure: BlindStructure = {
      ...baseStructure,
      levels: [{ ...baseStructure.levels[0], ante: 5 }, ...baseStructure.levels.slice(1)],
    };
    renderTimer(structure);

    expect(screen.getByText('Ante').nextSibling).toHaveTextContent('5');
  });

  it('shows "Press Play" before the timer starts', () => {
    renderTimer();

    expect(screen.getByText('Press Play')).toBeInTheDocument();
  });

  it('starts paused and toggles to running when Play is pressed', () => {
    renderTimer();

    const toggleButton = screen.getByRole('button', { name: 'Play' });
    expect(screen.getByRole('timer')).toHaveTextContent('03:00');

    fireEvent.click(toggleButton);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.queryByText('Press Play')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('02:59');

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(screen.getByText('Press Play')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('02:59');
  });

  it('increments and decrements the remaining time by 1 minute', () => {
    renderTimer();

    fireEvent.click(screen.getByRole('button', { name: 'Increase time by 1 minute' }));
    expect(screen.getByRole('timer')).toHaveTextContent('04:00');

    fireEvent.click(screen.getByRole('button', { name: 'Decrease time by 1 minute' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decrease time by 1 minute' }));
    expect(screen.getByRole('timer')).toHaveTextContent('02:00');
  });

  it('resets back to the initial time after running and adjusting, after confirming', () => {
    renderTimer();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Increase time by 1 minute' }));

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(window.confirm).toHaveBeenCalledWith('Reset the clock back to the initial time?');
    expect(screen.getByRole('timer')).toHaveTextContent('03:00');
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('does not reset the time when the user cancels the confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderTimer();

    fireEvent.click(screen.getByRole('button', { name: 'Increase time by 1 minute' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByRole('timer')).toHaveTextContent('04:00');
  });

  it('hides the hours segment when the remaining time is under 60 minutes', () => {
    renderTimer();

    expect(screen.getByRole('timer')).toHaveTextContent('03:00');
    expect(screen.getByRole('timer')).not.toHaveTextContent(':03:00');
  });

  it('shows an unpadded hours segment once the remaining time reaches 60 minutes', () => {
    const structure: BlindStructure = {
      ...baseStructure,
      levels: [{ ...baseStructure.levels[0], initialSeconds: 65 * 60 + 49 }, ...baseStructure.levels.slice(1)],
    };
    renderTimer(structure);

    expect(screen.getByRole('timer')).toHaveTextContent('1:05:49');
  });

  it('disables the Previous button on the first level', () => {
    renderTimer();

    expect(screen.getByRole('button', { name: 'Previous level' })).toBeDisabled();
  });

  it('moves to the next level when Next is pressed, and enables Previous', () => {
    renderTimer();

    fireEvent.click(screen.getByRole('button', { name: 'Next level' }));

    expect(screen.getByRole('heading', { name: 'Level 2' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('02:00');
    expect(screen.getByRole('button', { name: 'Previous level' })).not.toBeDisabled();
  });

  it('moves back to the previous level when Previous is pressed', () => {
    renderTimer();

    fireEvent.click(screen.getByRole('button', { name: 'Next level' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous level' }));

    expect(screen.getByRole('heading', { name: 'Level 1' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('03:00');
    expect(screen.getByRole('button', { name: 'Previous level' })).toBeDisabled();
  });

  it('prompts to end the game when Next is pressed on the last level, and ends it when confirmed', () => {
    renderTimer();

    fireEvent.click(screen.getByRole('button', { name: 'Next level' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next level' }));

    expect(screen.getByRole('heading', { name: 'Level 3' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next level' }));

    expect(window.confirm).toHaveBeenCalledWith('This is the last level. End the game?');
    expect(screen.getByText('Game has ended')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
  });

  it('does not end the game when the user cancels the last-level confirmation', () => {
    renderTimer();

    fireEvent.click(screen.getByRole('button', { name: 'Next level' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next level' }));

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Next level' }));

    expect(screen.queryByText('Game has ended')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Level 3' })).toBeInTheDocument();
  });

  it('automatically advances to the next level and keeps running when a level expires', () => {
    renderTimer();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    act(() => {
      vi.advanceTimersByTime(3 * 60 * 1000);
    });

    expect(screen.getByRole('heading', { name: 'Level 2' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('02:00');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('automatically ends the game when the last level expires', () => {
    renderTimer();

    fireEvent.click(screen.getByRole('button', { name: 'Next level' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next level' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(screen.getByText('Game has ended')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
  });

  it('prompts to stop the timer before going to Settings, and pauses when confirmed', () => {
    renderTimer();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(window.confirm).toHaveBeenCalledWith('Stop the timer and go to Settings?');
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('does not pause or navigate away when the user cancels the stop-timer prompt', () => {
    renderTimer();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('navigates to Settings without prompting when the timer is not running', () => {
    renderTimer();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(window.confirm).not.toHaveBeenCalled();
  });
});
