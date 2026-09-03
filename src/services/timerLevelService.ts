import type { TimerLevel } from '../models/TimerLevel';

const FIVE_MINUTES_IN_SECONDS = 5 * 60;

/**
 * Returns the default level shown when the app first loads. Replace this
 * with a call to a real data source (API, local storage, etc.) once
 * multiple/custom levels are supported.
 */
export function getDefaultTimerLevel(): TimerLevel {
  return {
    title: 'Level 1',
    initialSeconds: FIVE_MINUTES_IN_SECONDS,
    smallBlind: 20,
    bigBlind: 10,
  };
}
