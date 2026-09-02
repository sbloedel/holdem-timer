import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useCountdown } from '../hooks/useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats the initial duration into hours, minutes, and seconds', () => {
    const { result } = renderHook(() => useCountdown(20 * 60, { autoStart: false }));

    expect(result.current.hours).toBe(0);
    expect(result.current.minutes).toBe(20);
    expect(result.current.seconds).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it('counts down by one second per tick once started', () => {
    const { result } = renderHook(() => useCountdown(65, { autoStart: false }));

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.minutes).toBe(1);
    expect(result.current.seconds).toBe(4);
  });

  it('stops at zero and marks the countdown complete', () => {
    const { result } = renderHook(() => useCountdown(1, { autoStart: false }));

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.totalSeconds).toBe(0);
    expect(result.current.isComplete).toBe(true);
    expect(result.current.isRunning).toBe(false);
  });

  it('reset restores the initial duration and stops the timer', () => {
    const { result } = renderHook(() => useCountdown(10, { autoStart: false }));

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.totalSeconds).toBe(10);
    expect(result.current.isRunning).toBe(false);
  });
});
