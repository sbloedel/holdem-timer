import { CountdownTimer } from '../components/CountdownTimer';
import { SITE_ORIGIN, useSeo } from '../hooks/useSeo';
import { getSelectedBlindStructure } from '../services/blindStructureStorage';

export function TimerPage() {
  const structure = getSelectedBlindStructure();

  useSeo({
    title: "Holdem Timer - Free Poker Blind Timer & Tournament Clock",
    description:
      "Holdem Timer is a free poker blind timer and tournament clock for Texas Hold'em home games. Track blind levels, antes and breaks with customizable blind structures - no sign-up, works on any device.",
    canonical: `${SITE_ORIGIN}/`,
  });

  return <CountdownTimer structure={structure} />;
}
