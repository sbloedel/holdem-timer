import { CountdownTimer } from '../components/CountdownTimer';
import { getDefaultTimerPresets } from '../services/timerPresetService';

const TWENTY_MINUTES_IN_SECONDS = getDefaultTimerPresets()[0].totalSeconds;

export function TimerPage() {
  return (
    <section>
      <h1>Hold'em Timer</h1>
      <CountdownTimer initialSeconds={TWENTY_MINUTES_IN_SECONDS} />
    </section>
  );
}
