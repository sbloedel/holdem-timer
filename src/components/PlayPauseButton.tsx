import styles from './PlayPauseButton.module.css';

export interface PlayPauseButtonProps {
  isRunning: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * A single toggle button: shows a triangle "play" icon while paused, and
 * two vertical bars ("pause" icon) while running.
 */
export function PlayPauseButton({ isRunning, onToggle, disabled }: PlayPauseButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={onToggle}
      disabled={disabled}
      aria-label={isRunning ? 'Pause' : 'Play'}
      aria-pressed={isRunning}
    >
      {isRunning ? (
        <span className={styles.pauseIcon} aria-hidden="true">
          <span className={styles.bar} />
          <span className={styles.bar} />
        </span>
      ) : (
        <span className={styles.playIcon} aria-hidden="true" />
      )}
    </button>
  );
}
