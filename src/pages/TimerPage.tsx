import { CountdownTimer } from '../components/CountdownTimer';
import { getDefaultTimerLevel } from '../services/timerLevelService';

export function TimerPage() {
  const level = getDefaultTimerLevel();

  return <CountdownTimer level={level} />;
}
