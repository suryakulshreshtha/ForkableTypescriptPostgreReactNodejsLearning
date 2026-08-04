export type MeditationCategory = 'sitting' | 'standing' | 'walking' | 'lying';

export interface Meditation {
  id: number;
  title: string;
  category: MeditationCategory;
  duration_minutes: number;
  description: string | null;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMeditationInput {
  title: string;
  category: MeditationCategory;
  duration_minutes: number;
  description?: string;
  audio_url?: string;
}

export interface UpdateMeditationInput {
  title?: string;
  category?: MeditationCategory;
  duration_minutes?: number;
  description?: string;
  audio_url?: string;
}

export const MEDITATION_CATEGORIES: MeditationCategory[] = ['sitting', 'standing', 'walking', 'lying'];
