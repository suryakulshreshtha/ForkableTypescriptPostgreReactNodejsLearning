import { calculateCurrentStreak, sumMinutes } from '../../src/utils/streak';

/**
 * These tests never touch the real clock or a database — every case pins
 * an explicit `asOf` date so results are 100% deterministic regardless of
 * when or where the suite runs.
 */
describe('calculateCurrentStreak', () => {
  const asOf = (iso: string) => new Date(iso);

  it('returns 0 for no sessions at all', () => {
    expect(calculateCurrentStreak([], asOf('2026-06-15T12:00:00Z'))).toBe(0);
  });

  it('returns 1 when the only session was today', () => {
    const streak = calculateCurrentStreak(['2026-06-15T08:00:00Z'], asOf('2026-06-15T20:00:00Z'));
    expect(streak).toBe(1);
  });

  it('returns 1 when the only session was yesterday (grace period, streak not yet broken)', () => {
    const streak = calculateCurrentStreak(['2026-06-14T08:00:00Z'], asOf('2026-06-15T09:00:00Z'));
    expect(streak).toBe(1);
  });

  it('returns 0 when the most recent session was 2+ days ago', () => {
    const streak = calculateCurrentStreak(['2026-06-13T08:00:00Z'], asOf('2026-06-15T09:00:00Z'));
    expect(streak).toBe(0);
  });

  it('counts 3 consecutive days correctly', () => {
    const streak = calculateCurrentStreak(
      ['2026-06-13T08:00:00Z', '2026-06-14T08:00:00Z', '2026-06-15T08:00:00Z'],
      asOf('2026-06-15T20:00:00Z')
    );
    expect(streak).toBe(3);
  });

  it('deduplicates multiple sessions on the same day into a single streak day', () => {
    const streak = calculateCurrentStreak(
      ['2026-06-15T06:00:00Z', '2026-06-15T12:00:00Z', '2026-06-15T18:00:00Z'],
      asOf('2026-06-15T23:00:00Z')
    );
    expect(streak).toBe(1);
  });

  it('only counts the contiguous run ending at asOf, ignoring an older separate streak', () => {
    const streak = calculateCurrentStreak(
      [
        '2026-06-01T08:00:00Z', // older streak, not contiguous
        '2026-06-02T08:00:00Z',
        '2026-06-14T08:00:00Z', // current streak starts here
        '2026-06-15T08:00:00Z',
      ],
      asOf('2026-06-15T20:00:00Z')
    );
    expect(streak).toBe(2);
  });

  it('correctly crosses a month boundary', () => {
    const streak = calculateCurrentStreak(
      ['2026-02-27T08:00:00Z', '2026-02-28T08:00:00Z', '2026-03-01T08:00:00Z'],
      asOf('2026-03-01T20:00:00Z')
    );
    expect(streak).toBe(3);
  });

  it('correctly crosses a year boundary', () => {
    const streak = calculateCurrentStreak(
      ['2026-12-30T08:00:00Z', '2026-12-31T08:00:00Z', '2027-01-01T08:00:00Z'],
      asOf('2027-01-01T20:00:00Z')
    );
    expect(streak).toBe(3);
  });

  it('breaks the streak on a single missed day in the middle', () => {
    const streak = calculateCurrentStreak(
      ['2026-06-12T08:00:00Z', '2026-06-14T08:00:00Z', '2026-06-15T08:00:00Z'], // 06-13 missing
      asOf('2026-06-15T20:00:00Z')
    );
    expect(streak).toBe(2);
  });

  it('ignores time-of-day and only compares calendar days', () => {
    const streak = calculateCurrentStreak(['2026-06-15T23:59:00Z'], asOf('2026-06-15T00:01:00Z'));
    expect(streak).toBe(1);
  });

  it('accepts Date objects as well as ISO strings', () => {
    const streak = calculateCurrentStreak(
      [new Date('2026-06-15T08:00:00Z')],
      new Date('2026-06-15T20:00:00Z')
    );
    expect(streak).toBe(1);
  });
});

describe('sumMinutes', () => {
  it('returns 0 for an empty list', () => {
    expect(sumMinutes([])).toBe(0);
  });

  it('sums duration_minutes across sessions', () => {
    expect(
      sumMinutes([{ duration_minutes: 10 }, { duration_minutes: 20 }, { duration_minutes: 15 }])
    ).toBe(45);
  });
});
