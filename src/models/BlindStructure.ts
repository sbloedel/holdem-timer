import type { TimerLevel } from './TimerLevel';

/**
 * A named sequence of blind levels that a game progresses through.
 */
export interface BlindStructure {
  name: string;
  description: string;
  levels: TimerLevel[];
}
