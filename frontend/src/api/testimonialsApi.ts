import { Testimonial } from '../types/testimonial';
import { handleResponse } from './httpClient';

const BASE_URL = '/api/testimonials';

export const testimonialsApi = {
  async getAll(): Promise<Testimonial[]> {
    const res = await fetch(BASE_URL);
    return handleResponse<Testimonial[]>(res);
  },

  async submit(name: string, story: string, category?: string): Promise<Testimonial> {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, story, category }),
    });
    return handleResponse<Testimonial>(res);
  },
};
