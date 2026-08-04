import { Task } from '../types/task';

const BASE_URL = '/api/tasks';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export const tasksApi = {
  async getAll(): Promise<Task[]> {
    const res = await fetch(BASE_URL);
    return handleResponse<Task[]>(res);
  },

  async create(title: string, description?: string): Promise<Task> {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
    return handleResponse<Task>(res);
  },

  async toggleComplete(id: number, is_complete: boolean): Promise<Task> {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_complete }),
    });
    return handleResponse<Task>(res);
  },

  async remove(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    return handleResponse<void>(res);
  },
};
