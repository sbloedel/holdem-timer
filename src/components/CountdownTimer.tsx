import { useCountdown } from '../hooks/useCountdown';
import { PlayPauseButton } from './PlayPauseButton';
import { ResetButton } from './ResetButton';
import type { TimerLevel } from '../models/TimerLevel';
import styles from './CountdownTimer.module.css';

const pad = (value: number): string => value.toString().padStart(2, '0');
const ONE_MINUTE_IN_SECONDS = 60;

export interface CountdownTimerProps {
  level: TimerLevel;
}

export function CountdownTimer({ level }: CountdownTimerProps) {
  const { hours, minutes, seconds, isRunning, isComplete, start, pause, reset, adjustBy } =
    useCountdown(level.initialSeconds, { autoStart: false });

  const handleToggle = () => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  };

  const hasAnte = typeof level.ante === 'number' && level.ante > 0;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{level.title}</h1>

      <div className={styles.timerRow}>
        <button
          type="button"
          className={styles.adjustButton}
          aria-label="Decrease time by 1 minute"
          onClick={() => adjustBy(-ONE_MINUTE_IN_SECONDS)}
        >
          −
        </button>

        <div className={styles.display} role="timer" aria-live="polite">
          <span className={styles.segment}>{pad(hours)}</span>
          <span className={styles.colon}>:</span>
          <span className={styles.segment}>{pad(minutes)}</span>
          <span className={styles.colon}>:</span>
          <span className={styles.segment}>{pad(seconds)}</span>
        </div>

        <button
          type="button"
          className={styles.adjustButton}
          aria-label="Increase time by 1 minute"
          onClick={() => adjustBy(ONE_MINUTE_IN_SECONDS)}
        >
          +
        </button>
      </div>

      <div className={styles.blinds}>
        <div className={styles.blindItem}>
          <span className={styles.blindLabel}>Small Blind</span>
          <span className={styles.blindValue}>{level.smallBlind}</span>
        </div>
        <div className={styles.blindItem}>
          <span className={styles.blindLabel}>Big Blind</span>
          <span className={styles.blindValue}>{level.bigBlind}</span>
        </div>
        {hasAnte && (
          <div className={styles.blindItem}>
            <span className={styles.blindLabel}>Ante</span>
            <span className={styles.blindValue}>{level.ante}</span>
          </div>
        )}
      </div>

      {isComplete && <p className={styles.status}>Time's up!</p>}

      <div className={styles.controlsRow}>
        <ResetButton onReset={reset} className={styles.resetPosition} />
        <PlayPauseButton isRunning={isRunning} onToggle={handleToggle} disabled={isComplete} />
      </div>
    </div>
  );
}
