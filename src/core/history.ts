import type { Completion } from './types';

/** Canonical history for derived statistics: one session per ID, completed by now.
 * Future-dated imports stay in the backup and become eligible when their time arrives.
 */
export function completedHistory(records: Completion[], now = new Date()): Completion[] {
  return [...new Map(records.map(record => [record.id, record])).values()]
    .filter(record => Number.isFinite(Date.parse(record.completedAt)) && Date.parse(record.completedAt) <= now.getTime())
    .sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || a.id.localeCompare(b.id));
}
