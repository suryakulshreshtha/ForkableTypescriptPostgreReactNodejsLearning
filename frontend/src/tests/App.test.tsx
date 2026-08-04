import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { tasksApi } from '../api/tasksApi';
import { Task } from '../types/task';

vi.mock('../api/tasksApi', () => ({
  tasksApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    toggleComplete: vi.fn(),
    remove: vi.fn(),
  },
}));

const mockedApi = vi.mocked(tasksApi);

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: 'Existing task',
  description: null,
  is_complete: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays tasks on mount', async () => {
    mockedApi.getAll.mockResolvedValueOnce([makeTask({ title: 'Loaded from API' })]);

    render(<App />);

    expect(screen.getByText('Loading tasks…')).toBeInTheDocument();
    expect(await screen.findByText('Loaded from API')).toBeInTheDocument();
    expect(mockedApi.getAll).toHaveBeenCalledTimes(1);
  });

  it('shows an error message when the initial load fails', async () => {
    mockedApi.getAll.mockRejectedValueOnce(new Error('network down'));

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('network down');
  });

  it('adds a new task to the list after creating it', async () => {
    const user = userEvent.setup();
    mockedApi.getAll.mockResolvedValueOnce([]);
    mockedApi.create.mockResolvedValueOnce(makeTask({ id: 2, title: 'Brand new' }));

    render(<App />);
    await screen.findByText('No tasks yet — add one above.');

    await user.type(screen.getByLabelText('Task title'), 'Brand new');
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(await screen.findByText('Brand new')).toBeInTheDocument();
    expect(mockedApi.create).toHaveBeenCalledWith('Brand new', undefined);
  });

  it('removes a task from the list after deleting it', async () => {
    const user = userEvent.setup();
    mockedApi.getAll.mockResolvedValueOnce([makeTask({ id: 5, title: 'Doomed' })]);
    mockedApi.remove.mockResolvedValueOnce(undefined);

    render(<App />);
    await screen.findByText('Doomed');

    await user.click(screen.getByLabelText('Delete Doomed'));

    await waitFor(() => expect(screen.queryByText('Doomed')).not.toBeInTheDocument());
    expect(mockedApi.remove).toHaveBeenCalledWith(5);
  });

  it('updates a task in place after toggling completion', async () => {
    const user = userEvent.setup();
    mockedApi.getAll.mockResolvedValueOnce([makeTask({ id: 8, title: 'Toggle me', is_complete: false })]);
    mockedApi.toggleComplete.mockResolvedValueOnce(makeTask({ id: 8, title: 'Toggle me', is_complete: true }));

    render(<App />);
    await screen.findByText('Toggle me');

    await user.click(screen.getByLabelText('Toggle Toggle me'));

    await waitFor(() => expect(screen.getByText('Toggle me')).toHaveStyle({ textDecoration: 'line-through' }));
    expect(mockedApi.toggleComplete).toHaveBeenCalledWith(8, true);
  });
});
