import { describe, expect, it } from 'vitest';
import { slotState, type CalendarDisplayEvent } from './slot-view';
const now = Date.parse('2026-11-03T10:00:00-06:00');
const until = now + 15 * 60000;
const busy: CalendarDisplayEvent = { id:'external', startsAt:'2026-11-03T11:00:00-06:00', endsAt:'2026-11-03T11:30:00-06:00', title:'Reservado', source:'Google', conflict:false };
describe('visible calendar slots', () => {
  it('never labels an empty unobserved calendar as free', () => expect(slotState(busy.startsAt, [], 0, false, now).status).toBe('UNKNOWN'));
  it('shows occupied intervals even when external coverage is missing', () => expect(slotState(busy.startsAt, [busy], 0, false, now).status).toBe('BUSY'));
  it('allows a consecutive half-hour only with fresh complete coverage', () => expect(slotState(busy.endsAt, [busy], until, false, now).status).toBe('FREE'));
  it('retains disputed occupancy as a conflict', () => expect(slotState(busy.startsAt, [{...busy, conflict:true}], until, false, now).status).toBe('CONFLICT'));
  it('withdraws free status when evidence expires or an external delivery is pending', () => {
    expect(slotState(busy.startsAt, [], until, true, now).status).toBe('UNKNOWN');
    expect(slotState(busy.startsAt, [], until, false, until+1).status).toBe('UNKNOWN');
  });
  it('does not invent consultation hours on weekends or Monday', () => {
    expect(slotState('2026-11-02T11:00:00-06:00', [], until, false, now).status).toBe('CLOSED');
    expect(slotState('2026-11-07T12:00:00-06:00', [], until, false, now).status).toBe('UNKNOWN');
    expect(slotState('2026-11-03T14:00:00-06:00', [], until, false, now).status).toBe('CLOSED');
  });
});
