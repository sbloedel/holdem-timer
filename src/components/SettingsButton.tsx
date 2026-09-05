import styles from './SettingsButton.module.css';

export interface SettingsButtonProps {
  onClick: () => void;
  /** Optional extra class name, used to position the button within a row. */
  className?: string;
}

/**
 * Small circular button showing a gear icon, used to navigate to the
 * Settings page where blind structures can be managed.
 */
export function SettingsButton({ onClick, className }: SettingsButtonProps) {
  return (
    <button
      type="button"
      className={className ? `${styles.button} ${className}` : styles.button}
      aria-label="Settings"
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.63l-1.92-3.32a.49.49 0 0 0-.6-.22l-2.39.96a7.16 7.16 0 0 0-1.62-.94l-.36-2.54a.49.49 0 0 0-.5-.42h-3.84a.49.49 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.49.49 0 0 0-.6.22L2.74 8.63a.49.49 0 0 0 .12.63l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.63l1.92 3.32c.14.24.42.34.68.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.25.42.5.42h3.84c.25 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.26.12.54.02.68-.22l1.92-3.32a.49.49 0 0 0-.12-.63l-2.03-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z"
        />
      </svg>
    </button>
  );
}
