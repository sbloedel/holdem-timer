/**
 * Represents a single blind level shown on the timer screen.
 */
export interface TimerLevel {
  /** Displayed heading for the level, e.g. "Level 1". */
  title: string;
  /** Duration this level runs for, in seconds, used when the timer resets. */
  initialSeconds: number;
  smallBlind: number;
  bigBlind: number;
  /** Optional ante. Omit or set to 0 to hide it from the display. */
  ante?: number;
}
