export function localDateKey(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dayNumber(dateKey: string): number {
  return Date.parse(`${dateKey}T00:00:00.000Z`) / 86400000;
}
