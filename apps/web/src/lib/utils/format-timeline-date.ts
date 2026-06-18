/**
 * Formats an ISO-8601 UTC timestamp for the timeline date column.
 * Returns { datePart, timePart } matching the prototype style:
 * "8 июн" / "09:10"
 *
 * Uses Russian locale with short month names and 24-hour time.
 */
export function formatTimelineDate(isoString: string): { datePart: string; timePart: string } {
  if (!isoString) return { datePart: '—', timePart: '' };

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return { datePart: '—', timePart: '' };

    const day = date.getUTCDate();
    const month = date.toLocaleString('ru-RU', { month: 'short', timeZone: 'UTC' });
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');

    return {
      datePart: `${day} ${month.replace(/\.$/, '')}`,
      timePart: `${hours}:${minutes}`,
    };
  } catch {
    return { datePart: '—', timePart: '' };
  }
}
