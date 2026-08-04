import { StreakSummary } from '../types/practiceSession';
import { handleResponse } from './httpClient';

const BASE_URL = '/api/sessions';

export const sessionsApi = {
  async logSession(
    meditationId: number,
    practicedBy: string,
    durationMinutes: number,
    coherenceRating?: number
  ) {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meditation_id: meditationId,
        practiced_by: practicedBy,
        duration_minutes: durationMinutes,
        coherence_rating: coherenceRating,
      }),
    });
    return handleResponse(res);
  },

  async getStreak(practicedBy: string): Promise<StreakSummary> {
    const res = await fetch(`${BASE_URL}/user/${encodeURIComponent(practicedBy)}/streak`);
    return handleResponse<StreakSummary>(res);
  },
};
