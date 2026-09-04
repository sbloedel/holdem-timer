import type { BlindStructure } from '../models/BlindStructure';

const FIVE_MINUTES_IN_SECONDS = 5 * 60;

/**
 * Returns the default blind structure shown when the app first loads.
 * Replace this with a call to a real data source (API, local storage, etc.)
 * once multiple/custom structures are supported.
 */
export function getDefaultBlindStructure(): BlindStructure {
  return {
    name: 'Sample Home Game',
    description: 'Sample 5 minute blind structure',
    levels: [
      { title: 'Level 1', initialSeconds: FIVE_MINUTES_IN_SECONDS, smallBlind: 10, bigBlind: 20, ante: 0 },
      { title: 'Level 2', initialSeconds: FIVE_MINUTES_IN_SECONDS, smallBlind: 20, bigBlind: 40, ante: 0 },
      { title: 'Level 3', initialSeconds: FIVE_MINUTES_IN_SECONDS, smallBlind: 30, bigBlind: 60, ante: 0 },
    ],
  };
}
