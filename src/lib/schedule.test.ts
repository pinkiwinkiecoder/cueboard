import { describe, expect, it } from 'vitest';
import {
  changedSince,
  dependencyConflicts,
  itemTimes,
  nowAndNext,
  overlaps,
  previewShift,
  startDelay,
  type ScheduleItem,
} from './schedule';

function item(
  id: string,
  start: string,
  end: string,
  extra: Partial<ScheduleItem> = {},
): ScheduleItem {
  return {
    id,
    day_id: 'd1',
    location_id: 'main',
    title: id,
    kind: 'other',
    starts_at: `2027-07-16T${start}:00Z`,
    ends_at: `2027-07-16T${end}:00Z`,
    status: 'planned',
    notes: null,
    responsible_id: null,
    department_ids: [],
    depends_on: null,
    actual_start: null,
    actual_end: null,
    ...extra,
  };
}

describe('itemTimes', () => {
  it('rekent lokale Brusselse tijd om', () => {
    expect(itemTimes('2027-07-16', '21:00', '22:30')).toEqual({
      starts_at: '2027-07-16T19:00:00.000Z',
      ends_at: '2027-07-16T20:30:00.000Z',
    });
  });
  it('een eindtijd na middernacht valt op de volgende dag', () => {
    expect(itemTimes('2027-07-16', '23:30', '00:30').ends_at).toBe('2027-07-16T22:30:00.000Z');
  });
});

describe('previewShift', () => {
  const items = [
    item('a', '14:00', '14:30'),
    item('b', '19:00', '20:00'),
    item('c', '20:30', '21:30'),
    item('live', '19:30', '20:00', { status: 'live' }),
    item('other', '19:00', '20:00', { location_id: 'tent' }),
  ];
  it('verschuift enkel items vanaf het tijdstip, op die locatie, niet live', () => {
    const p = previewShift(items, 'main', '2027-07-16T19:00:00Z', 15);
    expect(p.map((x) => x.item.id)).toEqual(['b', 'c']);
    expect(p[0]?.starts_at).toBe('2027-07-16T19:15:00.000Z');
    expect(p[1]?.ends_at).toBe('2027-07-16T21:45:00.000Z');
  });
  it('kan ook vroeger', () => {
    expect(previewShift(items, 'main', '2027-07-16T20:00:00Z', -10)[0]?.starts_at).toBe(
      '2027-07-16T20:20:00.000Z',
    );
  });
});

describe('nowAndNext', () => {
  const items = [
    item('a', '18:00', '19:00'),
    item('b', '19:00', '20:00'),
    item('c', '20:30', '21:30'),
    item('t1', '19:15', '19:45', { location_id: 'tent' }),
  ];
  it('geeft per locatie het huidige en volgende item', () => {
    const r = nowAndNext(items, new Date('2027-07-16T19:20:00Z'));
    const main = r.find((x) => x.locationId === 'main');
    expect(main?.current?.id).toBe('b');
    expect(main?.next?.id).toBe('c');
    expect(r.find((x) => x.locationId === 'tent')?.current?.id).toBe('t1');
  });
  it('tussen twee items: niets bezig, wel een volgende', () => {
    const main = nowAndNext(items, new Date('2027-07-16T20:10:00Z')).find(
      (x) => x.locationId === 'main',
    );
    expect(main?.current).toBeNull();
    expect(main?.next?.id).toBe('c');
  });
  it('een live item gaat voor op de klok (uitloop)', () => {
    const late = [item('a', '18:00', '19:00', { status: 'live' }), item('b', '19:00', '20:00')];
    const main = nowAndNext(late, new Date('2027-07-16T19:10:00Z'))[0];
    expect(main?.current?.id).toBe('a');
    expect(main?.next?.id).toBe('b');
  });
});

describe('controles', () => {
  it('vindt afhankelijkheden die te vroeg starten', () => {
    const items = [
      item('sc', '14:00', '15:00'),
      item('show', '14:30', '15:30', { depends_on: 'sc' }),
    ];
    expect([...dependencyConflicts(items)]).toEqual(['show']);
  });
  it('vindt overlap op dezelfde locatie, niet op verschillende', () => {
    const items = [
      item('a', '14:00', '15:00'),
      item('b', '14:30', '15:30'),
      item('c', '14:30', '15:30', { location_id: 'tent' }),
      item('d', '15:30', '16:00'),
    ];
    expect([...overlaps(items)].sort()).toEqual(['a', 'b']);
  });
  it('toont wijzigingen sinds laatst gezien', () => {
    const items = [
      item('a', '14:00', '15:00', { changed_at: '2027-07-16T10:00:00Z' }),
      item('b', '15:00', '16:00', { changed_at: '2027-07-16T12:00:00Z' }),
    ];
    expect(changedSince(items, Date.parse('2027-07-16T11:00:00Z')).map((x) => x.id)).toEqual(['b']);
    expect(changedSince(items, null)).toEqual([]);
  });
  it('berekent vertraging bij de start', () => {
    expect(startDelay(item('a', '19:00', '20:00', { actual_start: '2027-07-16T19:07:00Z' }))).toBe(
      7,
    );
    expect(startDelay(item('a', '19:00', '20:00'))).toBeNull();
  });
});
