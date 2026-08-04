import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreakDashboard } from '../components/StreakDashboard';

describe('StreakDashboard', () => {
  it('prompts for a name when practicedBy is empty', () => {
    render(<StreakDashboard practicedBy="" streak={null} loading={false} />);
    expect(screen.getByText('Enter your name above to see your streak.')).toBeInTheDocument();
  });

  it('shows a loading state while the streak is being fetched', () => {
    render(<StreakDashboard practicedBy="Alex" streak={null} loading={true} />);
    expect(screen.getByText('Loading streak…')).toBeInTheDocument();
  });

  it('renders the streak summary once loaded', () => {
    render(
      <StreakDashboard
        practicedBy="Alex"
        loading={false}
        streak={{ practiced_by: 'Alex', current_streak_days: 5, total_sessions: 12, total_minutes: 180 }}
      />
    );

    expect(screen.getByTestId('current-streak')).toHaveTextContent('Current streak: 5 days');
    expect(screen.getByText('Total sessions: 12')).toBeInTheDocument();
    expect(screen.getByText('Total minutes practiced: 180')).toBeInTheDocument();
  });

  it('uses singular "day" when the streak is exactly 1', () => {
    render(
      <StreakDashboard
        practicedBy="Alex"
        loading={false}
        streak={{ practiced_by: 'Alex', current_streak_days: 1, total_sessions: 1, total_minutes: 10 }}
      />
    );

    expect(screen.getByTestId('current-streak')).toHaveTextContent('Current streak: 1 day');
  });
});
