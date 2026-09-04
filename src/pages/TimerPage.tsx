import { CountdownTimer } from '../components/CountdownTimer';
import { getDefaultBlindStructure } from '../services/blindStructureService';

export function TimerPage() {
  const structure = getDefaultBlindStructure();

  return <CountdownTimer structure={structure} />;
}
