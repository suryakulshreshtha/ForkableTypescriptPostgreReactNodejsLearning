import { Meditation, MeditationCategory } from '../types/meditation';
import { handleResponse } from './httpClient';

const BASE_URL = '/api/meditations';

export const meditationsApi = {
  async getAll(category?: MeditationCategory): Promise<Meditation[]> {
    const url = category ? `${BASE_URL}?category=${category}` : BASE_URL;
    const res = await fetch(url);
    return handleResponse<Meditation[]>(res);
  },
};
