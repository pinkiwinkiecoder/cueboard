import { describe, expect, it } from 'vitest';
import { mapRows, parseDelimited, templateCsv } from './csvImport';

const ctx = {
  days: [
    { id: 'fri', date: '2027-07-16', label: 'Friday' },
    { id: 'sat', date: '2027-07-17', label: 'Zaterdag' },
  ],
  locations: [{ id: 'main', name: 'Main Stage' }],
  departments: [
    { id: 'prod', name: 'Production' },
    { id: 'hosp', name: 'Hospitality' },
  ],
};

describe('parseDelimited', () => {
  it('herkent tabs (plakken uit Excel)', () => {
    expect(parseDelimited('Day\tStart\nFriday\t20:00')).toEqual([
      ['Day', 'Start'],
      ['Friday', '20:00'],
    ]);
  });
  it('herkent puntkomma en aanhalingstekens', () => {
    expect(parseDelimited('a;b\n"x; y";"zei ""hoi"""\n\n')).toEqual([
      ['a', 'b'],
      ['x; y', 'zei "hoi"'],
    ]);
  });
  it('herkent komma en Windows-regeleinden', () => {
    expect(parseDelimited('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('mapRows', () => {
  it('leest Nederlandse kolommen, dagen, soorten en teams', () => {
    const rows = parseDelimited(
      'Dag;Begin;Einde;Titel;Soort;Podium;Afdeling;Opmerkingen\n' +
        'Zaterdag;20.00;21.30;Nova Ray;Optreden;Main Stage;Production, Hospitality;Pyro\n',
    );
    const r = mapRows(rows, ctx);
    expect(r.problems).toEqual([]);
    expect(r.items[0]).toMatchObject({
      day_id: 'sat',
      title: 'Nova Ray',
      kind: 'performance',
      location_id: 'main',
      department_ids: ['prod', 'hosp'],
      notes: 'Pyro',
      starts_at: '2027-07-17T18:00:00.000Z',
      ends_at: '2027-07-17T19:30:00.000Z',
    });
  });
  it('datum als dag, geen eindtijd = 30 min, onbekende locatie wordt nieuw', () => {
    const r = mapRows(
      parseDelimited('Date,Start,Title,Location\n16/07/2027,9:00,Briefing,Tent'),
      ctx,
    );
    expect(r.items[0]).toMatchObject({
      day_id: 'fri',
      ends_at: '2027-07-16T07:30:00.000Z',
      location_id: null,
      new_location: 'Tent',
      kind: 'other',
    });
  });
  it('meldt fouten per regel', () => {
    const r = mapRows(
      parseDelimited('Day;Start;Title\nMonday;20:00;X\nFriday;25:00;Y\nFriday;20:00;'),
      ctx,
    );
    expect(r.items).toEqual([]);
    expect(r.problems.map((p) => [p.line, p.key])).toEqual([
      [2, 'import.errDay'],
      [3, 'import.errStart'],
      [4, 'import.errTitle'],
    ]);
  });
  it('waarschuwt bij een onbekend team maar importeert wel', () => {
    const r = mapRows(parseDelimited('Day;Start;Title;Team\nFriday;20:00;X;Catering'), ctx);
    expect(r.items).toHaveLength(1);
    expect(r.problems[0]).toMatchObject({ key: 'import.warnTeam', value: 'Catering' });
  });
  it('zonder titel- of startkolom is er geen geldige kop', () => {
    expect(mapRows(parseDelimited('foo;bar\n1;2'), ctx).headerFound).toBe(false);
  });
  it('het voorbeeldbestand kan zelf geïmporteerd worden', () => {
    const r = mapRows(parseDelimited(templateCsv(['Friday'])), ctx);
    expect(r.items).toHaveLength(4);
  });
});
