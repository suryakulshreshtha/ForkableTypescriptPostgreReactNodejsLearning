/**
 * Computes the current consecutive-day practice streak from a list of
 * session timestamps, evaluated against a reference "as of" date.
 *
 * Semantics:
 *  - Multiple sessions on the same calendar day count once.
 *  - A streak is "alive" if the most recent practiced day is today or
 *    yesterday relative to `asOf` — practicing yesterday doesn't reset the
 *    streak to 0 until a full day has been missed, matching how most habit
 *    trackers define a streak (you get today's grace period).
 *  - Calendar days are computed in UTC for determinism. A production app
 *    would compute this per-user in their local timezone; that's a known,
 *    deliberate simplification here so tests never depend on the host
 *    machine's timezone or the moment they happen to run.
 *
 * `asOf` defaults to `new Date()` for real callers, but every test below
 * passes an explicit `asOf` — never assert time-dependent logic against
 * the live clock.
 */
export function calculateCurrentStreak(
  sessionTimestamps: (string | Date)[],
  asOf: Date = new Date()
): number {
  if (sessionTimestamps.length === 0) {
    return 0;
  }

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const toUtcDayMs = (d: Date): number => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  const practicedDayMsSet = new Set<number>(
    sessionTimestamps.map((ts) => toUtcDayMs(new Date(ts)))
  );

  const asOfDayMs = toUtcDayMs(asOf);
  const mostRecentPracticedDayMs = Math.max(...practicedDayMsSet);
  const gapFromAsOfDays = (asOfDayMs - mostRecentPracticedDayMs) / ONE_DAY_MS;

  // Most recent session is more than a day before `asOf` — streak is broken.
  if (gapFromAsOfDays > 1) {
    return 0;
  }

  // Walk backwards day-by-day from the most recent practiced day, counting
  // consecutive days present in the set. Stops at the first gap.
  let streak = 0;
  let cursor = mostRecentPracticedDayMs;
  while (practicedDayMsSet.has(cursor)) {
    streak += 1;
    cursor -= ONE_DAY_MS;
  }

  return streak;
}

export function sumMinutes(sessions: { duration_minutes: number }[]): number {
  return sessions.reduce((total, s) => total + s.duration_minutes, 0);
}
