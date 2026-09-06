import type { BlindStructure } from '../models/BlindStructure';
import type { TimerLevel } from '../models/TimerLevel';

const FIVE_MINUTES_IN_SECONDS = 5 * 60;
const TWENTY_MINUTES_IN_SECONDS = 20 * 60;

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

// Small blind, big blind for each WSOP level. The ante is a "big blind ante"
// (posted once by the big blind) and is equal to the big blind amount at
// every level in the official structure, so it's derived below rather than
// repeated here.
const WSOP_BLIND_PAIRS: Array<[smallBlind: number, bigBlind: number]> = [
  [100, 100],
  [100, 200],
  [200, 300],
  [200, 400],
  [300, 500],
  [300, 600],
  [400, 800],
  [500, 1000],
  [600, 1200],
  [800, 1600],
  [1000, 2000],
  [1000, 2500],
  [1500, 3000],
  [2000, 4000],
  [2500, 5000],
  [3000, 6000],
  [4000, 8000],
  [5000, 10000],
  [6000, 12000],
  [10000, 15000],
  [10000, 20000],
  [10000, 25000],
  [15000, 30000],
  [20000, 40000],
  [25000, 50000],
  [30000, 60000],
  [40000, 80000],
  [50000, 100000],
  [60000, 120000],
  [80000, 160000],
  [100000, 200000],
  [125000, 250000],
  [150000, 300000],
  [200000, 400000],
  [250000, 500000],
  [300000, 600000],
  [400000, 800000],
  [500000, 1000000],
  [600000, 1200000],
];

/**
 * Returns the WSOP (World Series of Poker) sample blind structure, using
 * the official published level progression. Each level runs for 20 minutes,
 * a common WSOP-style level length; adjust per-level durations from the
 * Settings screen if a different pace is desired.
 */
export function getWsopBlindStructure(): BlindStructure {
  const levels: TimerLevel[] = WSOP_BLIND_PAIRS.map(([smallBlind, bigBlind], index) => ({
    title: `Level ${index + 1}`,
    initialSeconds: TWENTY_MINUTES_IN_SECONDS,
    smallBlind,
    bigBlind,
    ante: bigBlind,
  }));

  return {
    name: 'WSOP',
    description: 'World Series of Poker',
    levels,
  };
}
