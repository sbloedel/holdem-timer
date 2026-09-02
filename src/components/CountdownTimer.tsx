import { useCountdown } from '../hooks/useCountdown';
import styles from './CountdownTimer.module.css';

const pad = (value: number): string => value.toString().padStart(2, '0');

export interface CountdownTimerProps {
  /** Total starting duration, in seconds. */
  initialSeconds: number;
}

export function CountdownTimer({ initialSeconds }: CountdownTimerProps) {
  const { hours, minutes, seconds, isRunning, isComplete, start, pause, reset } =
    useCountdown(initialSeconds);

  return (
    <div className={styles.container}>
      <div className={styles.display} role="timer" aria-live="polite">
        <span className={styles.segment}>{pad(hours)}</span>
        <span className={styles.colon}>:</span>
        <span className={styles.segment}>{pad(minutes)}</span>
        <span className={styles.colon}>:</span>
        <span className={styles.segment}>{pad(seconds)}</span>
      </div>

      {isComplete && <p className={styles.status}>Time's up!</p>}

      <div className={styles.controls}>
        <button type="button" onClick={start} disabled={isRunning || isComplete}>
          Start
        </button>
        <button type="button" onClick={pause} disabled={!isRunning}>
          Pause
        </button>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
