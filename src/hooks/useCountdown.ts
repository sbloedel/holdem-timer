import { useCallback, useEffect, useRef, useState } from 'react';

export interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

export interface UseCountdownResult extends CountdownTime {
  isRunning: boolean;
  isComplete: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

const toTime = (totalSeconds: number): CountdownTime => {
  const clamped = Math.max(0, totalSeconds);
  return {
    hours: Math.floor(clamped / 3600),
    minutes: Math.floor((clamped % 3600) / 60),
    seconds: Math.floor(clamped % 60),
    totalSeconds: clamped,
  };
};

/**
 * Counts down from `initialSeconds` to zero, ticking once per second.
 * Starts automatically by default; pass `autoStart: false` to require
 * an explicit call to `start()`.
 */
export function useCountdown(
  initialSeconds: number,
  options: { autoStart?: boolean } = {},
): UseCountdownResult {
  const { autoStart = true } = options;
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          setIsRunning(false);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const start = useCallback(() => {
    setSecondsLeft((previous) => (previous <= 0 ? previous : previous));
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  const time = toTime(secondsLeft);

  return {
    ...time,
    isRunning,
    isComplete: secondsLeft <= 0,
    start,
    pause,
    reset,
  };
}
