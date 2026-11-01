export type CalendarDisplayEvent = { id: string; startsAt: string; endsAt: string; title: string; source: string; conflict: boolean; href?: string };
const localParts = new Intl.DateTimeFormat('en-US', { timeZone:'America/Mexico_City', weekday:'short', hour:'2-digit', minute:'2-digit', hourCycle:'h23' });
export function slotState(startsAt: string, events: CalendarDisplayEvent[], verifiedUntil: number, pending: boolean, now: number) {
  const start = Date.parse(startsAt), end = start + 30 * 60000;
  const matches = events.filter(event => Date.parse(event.startsAt) < end && Date.parse(event.endsAt) > start);
  if (matches.length) return { status: matches.some(event => event.conflict) ? 'CONFLICT' : 'BUSY', events: matches };
  const parts = localParts.formatToParts(new Date(start));
  const value = (kind: string) => parts.find(part => part.type === kind)?.value;
  const weekday = value('weekday'), minutes = Number(value('hour')) * 60 + Number(value('minute'));
  const inHours = ['Tue','Thu'].includes(weekday) && ((minutes >= 660 && minutes < 840) || (minutes >= 960 && minutes < 1140));
  if (weekday !== 'Sat' && !inHours) return { status:'CLOSED', events:matches };
  return { status: inHours && start >= now && verifiedUntil > now && !pending ? 'FREE' : 'UNKNOWN', events:matches };
}
