import { useNavigate } from 'react-router-dom';
import { useBlindStructureTimer } from '../hooks/useBlindStructureTimer';
import { PlayPauseButton } from './PlayPauseButton';
import { ResetButton } from './ResetButton';
import { SettingsButton } from './SettingsButton';
import { SkipButton } from './SkipButton';
import type { BlindStructure } from '../models/BlindStructure';
import styles from './CountdownTimer.module.css';

const pad = (value: number): string => value.toString().padStart(2, '0');
const ONE_MINUTE_IN_SECONDS = 60;

export interface CountdownTimerProps {
  structure: BlindStructure;
}

export function CountdownTimer({ structure }: CountdownTimerProps) {
  const navigate = useNavigate();
  const {
    level,
    hours,
    minutes,
    seconds,
    isRunning,
    isGameEnded,
    isFirstLevel,
    isLastLevel,
    start,
    pause,
    reset,
    adjustBy,
    goToPrevious,
    goToNext,
    endGame,
  } = useBlindStructureTimer(structure);

  const handleToggle = () => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  };

  const handleSettingsClick = () => {
    if (isRunning) {
      const confirmed = window.confirm('Stop the timer and go to Settings?');
      if (!confirmed) {
        return;
      }
      pause();
    }
    navigate('/settings');
  };

  const hasAnte = typeof level.ante === 'number' && level.ante > 0;
  const hasHours = hours > 0;

  const statusText = isGameEnded ? 'Game has ended' : !isRunning ? 'Press Play' : null;

  return (
    <div className={styles.container}>
      <div className={styles.topSection}>
        <h1 className={styles.title}>{level.title}</h1>

        <div className={styles.timerRow}>
          <button
            type="button"
            className={styles.adjustButton}
            aria-label="Decrease time by 1 minute"
            onClick={() => adjustBy(-ONE_MINUTE_IN_SECONDS)}
            disabled={isGameEnded}
          >
            −
          </button>

          <div
            className={`${styles.display} ${hasHours ? styles.displayWithHours : ''}`}
            role="timer"
            aria-live="polite"
          >
            {hasHours && (
              <>
                <span className={styles.segment}>{hours}</span>
                <span className={styles.colon}>:</span>
              </>
            )}
            <span className={styles.segment}>{pad(minutes)}</span>
            <span className={styles.colon}>:</span>
            <span className={styles.segment}>{pad(seconds)}</span>
          </div>

          <button
            type="button"
            className={styles.adjustButton}
            aria-label="Increase time by 1 minute"
            onClick={() => adjustBy(ONE_MINUTE_IN_SECONDS)}
            disabled={isGameEnded}
          >
            +
          </button>
        </div>

        <div className={styles.blinds}>
          <div className={styles.blindItem}>
            <span className={styles.blindLabel}>Small Blind</span>
            <span className={styles.blindValue}>{level.smallBlind}</span>
          </div>
          <div className={styles.blindItem}>
            <span className={styles.blindLabel}>Big Blind</span>
            <span className={styles.blindValue}>{level.bigBlind}</span>
          </div>
          {hasAnte && (
            <div className={styles.blindItem}>
              <span className={styles.blindLabel}>Ante</span>
              <span className={styles.blindValue}>{level.ante}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.bottomGroup}>
        <div className={styles.statusSection}>
          {statusText && <p className={styles.status}>{statusText}</p>}
        </div>

        <div className={styles.controlsRow}>
          <ResetButton onReset={reset} className={styles.resetPosition} />

          <div className={styles.transportGroup}>
            <SkipButton direction="previous" onClick={goToPrevious} disabled={isFirstLevel} />
            <PlayPauseButton isRunning={isRunning} onToggle={handleToggle} disabled={isGameEnded} />
            <SkipButton
              direction="next"
              onClick={isLastLevel ? endGame : goToNext}
              confirmMessage={isLastLevel ? 'This is the last level. End the game?' : undefined}
            />
          </div>

          <SettingsButton onClick={handleSettingsClick} className={styles.settingsPosition} />
        </div>
      </div>
    </div>
  );
}
