import { useCallback, useEffect, useState } from 'react';
import type { BlindStructure } from '../models/BlindStructure';
import type { TimerLevel } from '../models/TimerLevel';

export interface UseBlindStructureTimerResult {
  level: TimerLevel;
  levelIndex: number;
  levelCount: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isRunning: boolean;
  isGameEnded: boolean;
  isFirstLevel: boolean;
  isLastLevel: boolean;
  start: () => void;
  pause: () => void;
  /** Resets the current level's remaining time back to its initial duration. */
  reset: () => void;
  /** Adjusts the remaining time by `deltaSeconds` (can be negative). Clamped at 0. */
  adjustBy: (deltaSeconds: number) => void;
  /** Moves to the previous level, if one exists, restarting its time. */
  goToPrevious: () => void;
  /** Moves to the next level, if one exists, restarting its time. No-op on the last level. */
  goToNext: () => void;
  /** Stops the timer and marks the game as ended. */
  endGame: () => void;
}

const toTime = (totalSeconds: number) => {
  const clamped = Math.max(0, totalSeconds);
  return {
    hours: Math.floor(clamped / 3600),
    minutes: Math.floor((clamped % 3600) / 60),
    seconds: Math.floor(clamped % 60),
    totalSeconds: clamped,
  };
};

/**
 * Drives the countdown for an entire blind structure. Ticks down the
 * current level once per second; when a level's time expires it
 * automatically advances to the next level and keeps running, or ends
 * the game once the last level's time expires.
 */
export function useBlindStructureTimer(structure: BlindStructure): UseBlindStructureTimerResult {
  const { levels } = structure;
  const [levelIndex, setLevelIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(levels[0].initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isGameEnded, setIsGameEnded] = useState(false);

  const isLastLevel = levelIndex >= levels.length - 1;

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((previous) => (previous <= 1 ? 0 : previous - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, levelIndex]);

  // Handles level completion: advance to the next level and keep running,
  // or end the game if the last level just finished.
  useEffect(() => {
    if (!isRunning || secondsLeft > 0) {
      return;
    }

    if (isLastLevel) {
      setIsRunning(false);
      setIsGameEnded(true);
      return;
    }

    const nextIndex = levelIndex + 1;
    setLevelIndex(nextIndex);
    setSecondsLeft(levels[nextIndex].initialSeconds);
  }, [secondsLeft, isRunning, isLastLevel, levelIndex, levels]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setIsGameEnded(false);
    setSecondsLeft(levels[levelIndex].initialSeconds);
  }, [levels, levelIndex]);

  const adjustBy = useCallback((deltaSeconds: number) => {
    setSecondsLeft((previous) => Math.max(0, previous + deltaSeconds));
  }, []);

  const goToPrevious = useCallback(() => {
    if (levelIndex <= 0) {
      return;
    }
    const previousIndex = levelIndex - 1;
    setLevelIndex(previousIndex);
    setSecondsLeft(levels[previousIndex].initialSeconds);
    setIsGameEnded(false);
  }, [levelIndex, levels]);

  const goToNext = useCallback(() => {
    if (isLastLevel) {
      return;
    }
    const nextIndex = levelIndex + 1;
    setLevelIndex(nextIndex);
    setSecondsLeft(levels[nextIndex].initialSeconds);
    setIsGameEnded(false);
  }, [levelIndex, levels, isLastLevel]);

  const endGame = useCallback(() => {
    setIsRunning(false);
    setIsGameEnded(true);
  }, []);

  const time = toTime(secondsLeft);

  return {
    level: levels[levelIndex],
    levelIndex,
    levelCount: levels.length,
    ...time,
    isRunning,
    isGameEnded,
    isFirstLevel: levelIndex === 0,
    isLastLevel,
    start,
    pause,
    reset,
    adjustBy,
    goToPrevious,
    goToNext,
    endGame,
  };
}
