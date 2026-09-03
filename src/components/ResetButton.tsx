import styles from './ResetButton.module.css';

export interface ResetButtonProps {
  onReset: () => void;
  /** Optional extra class name, used to position the button within a row. */
  className?: string;
}

/**
 * Small circular button showing a clockwise "refresh" arrow. Asks the user
 * to confirm before invoking `onReset`, since resetting discards progress
 * on the current level.
 */
export function ResetButton({ onReset, className }: ResetButtonProps) {
  const handleClick = () => {
    const confirmed = window.confirm('Reset the clock back to the initial time?');
    if (confirmed) {
      onReset();
    }
  };

  return (
    <button
      type="button"
      className={className ? `${styles.button} ${className}` : styles.button}
      aria-label="Reset"
      onClick={handleClick}
    >
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
        />
      </svg>
    </button>
  );
}
