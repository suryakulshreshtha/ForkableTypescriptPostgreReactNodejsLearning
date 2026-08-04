import { Retreat } from '../types/retreat';
import { handleResponse } from './httpClient';

const BASE_URL = '/api/retreats';

export const retreatsApi = {
  async getAll(): Promise<Retreat[]> {
    const res = await fetch(BASE_URL);
    return handleResponse<Retreat[]>(res);
  },

  async register(id: number): Promise<Retreat> {
    const res = await fetch(`${BASE_URL}/${id}/register`, { method: 'POST' });
    return handleResponse<Retreat>(res);
  },
};
