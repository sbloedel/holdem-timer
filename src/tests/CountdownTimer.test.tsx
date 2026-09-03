import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CountdownTimer } from '../components/CountdownTimer';
import type { TimerLevel } from '../models/TimerLevel';

const baseLevel: TimerLevel = {
  title: 'Level 2',
  initialSeconds: 3 * 60,
  smallBlind: 20,
  bigBlind: 10,
};

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays title, blinds, and hides the ante when it is 0', () => {
    render(<CountdownTimer level={baseLevel} />);

    expect(screen.getByRole('heading', { name: 'Level 2' })).toBeInTheDocument();
    expect(screen.getByText('Small Blind').nextSibling).toHaveTextContent('20');
    expect(screen.getByText('Big Blind').nextSibling).toHaveTextContent('10');
    expect(screen.queryByText('Ante')).not.toBeInTheDocument();
  });

  it('displays the ante when it is greater than 0', () => {
    render(<CountdownTimer level={{ ...baseLevel, ante: 5 }} />);

    expect(screen.getByText('Ante').nextSibling).toHaveTextContent('5');
  });

  it('starts paused and toggles to running when Play is pressed', () => {
    render(<CountdownTimer level={baseLevel} />);

    const toggleButton = screen.getByRole('button', { name: 'Play' });
    expect(screen.getByRole('timer')).toHaveTextContent('00:03:00');

    fireEvent.click(toggleButton);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('00:02:59');

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('00:02:59');
  });

  it('increments and decrements the remaining time by 1 minute', () => {
    render(<CountdownTimer level={baseLevel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Increase time by 1 minute' }));
    expect(screen.getByRole('timer')).toHaveTextContent('00:04:00');

    fireEvent.click(screen.getByRole('button', { name: 'Decrease time by 1 minute' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decrease time by 1 minute' }));
    expect(screen.getByRole('timer')).toHaveTextContent('00:02:00');
  });

  it('resets back to the initial time after running and adjusting', () => {
    render(<CountdownTimer level={baseLevel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Increase time by 1 minute' }));

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByRole('timer')).toHaveTextContent('00:03:00');
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });
});
