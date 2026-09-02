/**
 * Placeholder for future business logic that isn't tied to a specific
 * component (e.g. persisting timer presets, calling a backend API).
 * Keeping a `services/` folder from the start makes it obvious where
 * that logic should live as the app grows.
 */
export interface TimerPreset {
  id: string;
  label: string;
  totalSeconds: number;
}

const DEFAULT_PRESETS: TimerPreset[] = [
  { id: 'default-20-min', label: '20 minutes', totalSeconds: 20 * 60 },
];

export function getDefaultTimerPresets(): TimerPreset[] {
  return DEFAULT_PRESETS;
}
