import { StreakSummary } from '../types/practiceSession';

interface StreakDashboardProps {
  practicedBy: string;
  streak: StreakSummary | null;
  loading: boolean;
}

export function StreakDashboard({ practicedBy, streak, loading }: StreakDashboardProps) {
  if (practicedBy.trim().length === 0) {
    return <p>Enter your name above to see your streak.</p>;
  }

  if (loading) {
    return <p>Loading streak…</p>;
  }

  if (!streak) {
    return null;
  }

  return (
    <section aria-label="Streak dashboard">
      <p data-testid="current-streak">
        Current streak: <strong>{streak.current_streak_days}</strong>{' '}
        {streak.current_streak_days === 1 ? 'day' : 'days'}
      </p>
      <p>Total sessions: {streak.total_sessions}</p>
      <p>Total minutes practiced: {streak.total_minutes}</p>
    </section>
  );
}
