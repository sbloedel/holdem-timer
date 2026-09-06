import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlindStructureTimer } from '../hooks/useBlindStructureTimer';
import type { BlindStructure } from '../models/BlindStructure';
import * as levelChangeSound from '../services/levelChangeSound';

const structure: BlindStructure = {
  name: 'Test Structure',
  description: 'A structure used for tests',
  levels: [
    { title: 'Level 1', initialSeconds: 5, smallBlind: 10, bigBlind: 20 },
    { title: 'Level 2', initialSeconds: 10, smallBlind: 20, bigBlind: 40 },
    { title: 'Level 3', initialSeconds: 3, smallBlind: 30, bigBlind: 60 },
  ],
};

describe('useBlindStructureTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts on the first level, paused, with its initial duration', () => {
    const { result } = renderHook(() => useBlindStructureTimer(structure));

    expect(result.current.levelIndex).toBe(0);
    expect(result.current.level.title).toBe('Level 1');
    expect(result.current.totalSeconds).toBe(5);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isFirstLevel).toBe(true);
    expect(result.current.isLastLevel).toBe(false);
  });

  it('counts down by one second per tick once started', () => {
    const { result } = renderHook(() => useBlindStructureTimer(structure));

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(1000));

    expect(result.current.totalSeconds).toBe(4);
  });

  it('auto-advances to the next level and keeps running when a level expires', () => {
    const { result } = renderHook(() => useBlindStructureTimer(structure));

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(5000));

    expect(result.current.levelIndex).toBe(1);
    expect(result.current.level.title).toBe('Level 2');
    expect(result.current.totalSeconds).toBe(10);
    expect(result.current.isRunning).toBe(true);
    expect(result.current.isGameEnded).toBe(false);
  });

  it('ends the game automatically when the last level expires', () => {
    const { result } = renderHook(() => useBlindStructureTimer(structure));

    act(() => result.current.goToNext());
    act(() => result.current.goToNext());
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));

    expect(result.current.isLastLevel).toBe(true);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isGameEnded).toBe(true);
  });

  it('goToNext moves forward and is a no-op on the last level', () => {
    const { result } = renderHook(() => useBlindStructureTimer(structure));

    act(() => result.current.goToNext());
    expect(result.current.levelIndex).toBe(1);

    act(() => result.current.goToNext());
    expect(result.current.levelIndex).toBe(2);
    expect(result.current.isLastLevel).toBe(true);

    act(() => result.current.goToNext());
    expect(result.current.levelIndex).toBe(2);
  });

  it('goToPrevious moves backward and is a no-op on the first level', () => {
    const { result } = renderHook(() => useBlindStructureTimer(structure));

    act(() => result.current.goToPrevious());
    expect(result.current.levelIndex).toBe(0);
    expect(result.current.isFirstLevel).toBe(true);

    act(() => result.current.goToNext());
    act(() => result.current.goToPrevious());
    expect(result.current.levelIndex).toBe(0);
    expect(result.current.totalSeconds).toBe(5);
  });

  it('reset restores the current level initial duration, stops the timer, and clears game-ended', () => {
    const { result } = renderHook(() => useBlindStructureTimer(structure));

    act(() => result.current.goToNext());
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));
    act(() => result.current.reset());

    expect(result.current.totalSeconds).toBe(10);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isGameEnded).toBe(false);
  });

  it('endGame stops the timer and marks the game as ended', () => {
    const { result } = renderHook(() => useBlindStructureTimer(structure));

    act(() => result.current.start());
    act(() => result.current.endGame());

    expect(result.current.isRunning).toBe(false);
    expect(result.current.isGameEnded).toBe(true);
  });

  it('adjustBy changes the remaining time and is clamped at 0', () => {
    const { result } = renderHook(() => useBlindStructureTimer(structure));

    act(() => result.current.adjustBy(-100));
    expect(result.current.totalSeconds).toBe(0);
  });

  it('plays a chime when the level advances but not on mount or when moving backward', () => {
    const chimeSpy = vi.spyOn(levelChangeSound, 'playLevelChangeChime').mockImplementation(() => {});
    const { result } = renderHook(() => useBlindStructureTimer(structure));

    expect(chimeSpy).not.toHaveBeenCalled();

    act(() => result.current.goToNext());
    expect(chimeSpy).toHaveBeenCalledTimes(1);

    act(() => result.current.goToPrevious());
    expect(chimeSpy).toHaveBeenCalledTimes(1);

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(5000));
    expect(chimeSpy).toHaveBeenCalledTimes(2);
  });
});
