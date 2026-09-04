import styles from './SkipButton.module.css';

export interface SkipButtonProps {
  direction: 'previous' | 'next';
  onClick: () => void;
  disabled?: boolean;
  /** When provided, the user must confirm this message before `onClick` fires. */
  confirmMessage?: string;
  /** Optional extra class name, used to position the button within a row. */
  className?: string;
}

/**
 * Small circular button showing a "skip previous"/"skip next" icon,
 * similar to the transport controls on a CD player. Sized to match
 * ResetButton. When `confirmMessage` is provided, prompts the user for
 * confirmation before invoking `onClick`.
 */
export function SkipButton({ direction, onClick, disabled, confirmMessage, className }: SkipButtonProps) {
  const handleClick = () => {
    if (confirmMessage) {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) {
        return;
      }
    }
    onClick();
  };

  return (
    <button
      type="button"
      className={className ? `${styles.button} ${className}` : styles.button}
      aria-label={direction === 'previous' ? 'Previous level' : 'Next level'}
      onClick={handleClick}
      disabled={disabled}
    >
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true" focusable="false">
        {direction === 'previous' ? (
          <path fill="currentColor" d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        ) : (
          <path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6z" />
        )}
      </svg>
    </button>
  );
}
