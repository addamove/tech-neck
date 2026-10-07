import { useEffect, useState } from 'react';
import { localDateKey } from './stats';

export function calendarContext(now = new Date()): string {
  return `${Intl.DateTimeFormat().resolvedOptions().timeZone}:${localDateKey(now)}:${now.getHours()}:${now.getMinutes()}`;
}
/** Refresh calendar values at midnight, timezone changes and newly eligible imported timestamps. */
export function useCalendarClock(): string {
  const [context, setContext] = useState(calendarContext);
  useEffect(() => {
    let timer: number;
    const refresh = () => {
      clearTimeout(timer);
      const now = new Date();
      setContext(calendarContext(now));
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = window.setTimeout(refresh, Math.max(25, Math.min(60000, midnight.getTime() - now.getTime() + 25)));
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', refresh);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('focus', refresh); };
  }, []);
  return context;
}
