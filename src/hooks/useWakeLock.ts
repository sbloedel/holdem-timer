import { useEffect, useRef } from 'react';

/**
 * Requests a Screen Wake Lock while `active` is true, so a mobile device's
 * screen does not dim or lock while the timer is being viewed. Silently
 * no-ops on browsers that don't support the API, and re-acquires the lock
 * whenever the page becomes visible again (the browser releases it
 * automatically whenever the tab is hidden, e.g. when the phone is
 * switched to another app).
 */
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) {
      return;
    }

    let cancelled = false;

    const requestLock = async () => {
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          await sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
      } catch {
        // Wake lock requests can be rejected (e.g. low battery, permissions,
        // or lack of support); this is a non-critical enhancement, so fail
        // silently rather than surfacing an error to the user.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestLock();
      }
    };

    void requestLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };
  }, [active]);
}
