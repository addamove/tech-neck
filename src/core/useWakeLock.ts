import { useEffect, useState } from 'react';
import type { WakeLockStatus } from './types';
interface Lock { release(): Promise<void>; addEventListener(type: 'release', callback: () => void): void }
interface WakeNavigator { wakeLock?: { request(type: 'screen'): Promise<Lock> } }

export function useWakeLock(wanted: boolean): WakeLockStatus {
  const supported = typeof navigator !== 'undefined' && Boolean((navigator as unknown as WakeNavigator).wakeLock);
  const [status, setStatus] = useState<WakeLockStatus>(supported ? 'off' : 'unsupported');
  useEffect(() => {
    if (!supported) { setStatus('unsupported'); return; }
    if (!wanted) { setStatus('off'); return; }
    let canceled = false;
    let lock: Lock | null = null;
    let pending = false;
    const request = async () => {
      if (canceled || pending || lock || document.visibilityState !== 'visible') return;
      pending = true; setStatus('requesting');
      try {
        const acquired = await (navigator as unknown as WakeNavigator).wakeLock!.request('screen');
        if (canceled) { await acquired.release(); return; }
        lock = acquired; setStatus('active');
        acquired.addEventListener('release', () => {
          if (lock === acquired) lock = null;
          if (!canceled) { setStatus('unavailable'); void request(); }
        });
      } catch { if (!canceled) setStatus('unavailable'); }
      finally { pending = false; }
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') void request(); };
    void request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { canceled = true; document.removeEventListener('visibilitychange', onVisibility); if (lock) void lock.release().catch(() => {}); };
  }, [wanted, supported]);
  return status;
}
