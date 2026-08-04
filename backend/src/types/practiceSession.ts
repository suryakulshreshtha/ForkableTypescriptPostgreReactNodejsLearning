export interface PracticeSession {
  id: number;
  meditation_id: number;
  practiced_by: string;
  duration_minutes: number;
  coherence_rating: number | null;
  completed_at: string;
}

export interface LogSessionInput {
  meditation_id: number;
  practiced_by: string;
  duration_minutes: number;
  coherence_rating?: number;
  completed_at?: string;
}

export interface StreakSummary {
  practiced_by: string;
  current_streak_days: number;
  total_sessions: number;
  total_minutes: number;
}
