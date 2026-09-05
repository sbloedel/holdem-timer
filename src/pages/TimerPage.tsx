import { CountdownTimer } from '../components/CountdownTimer';
import { getSelectedBlindStructure } from '../services/blindStructureStorage';

export function TimerPage() {
  const structure = getSelectedBlindStructure();

  return <CountdownTimer structure={structure} />;
}
