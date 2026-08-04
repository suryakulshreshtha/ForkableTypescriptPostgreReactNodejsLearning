import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskList } from '../components/TaskList';
import { Task } from '../types/task';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: 'Sample task',
  description: null,
  is_complete: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('TaskList', () => {
  it('renders an empty state message when there are no tasks', () => {
    render(<TaskList tasks={[]} onToggle={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('No tasks yet — add one above.')).toBeInTheDocument();
  });

  it('renders one list item per task, including optional description', () => {
    const tasks = [
      makeTask({ id: 1, title: 'First' }),
      makeTask({ id: 2, title: 'Second', description: 'has a description' }),
    ];
    render(<TaskList tasks={tasks} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByTestId('task-1')).toBeInTheDocument();
    expect(screen.getByTestId('task-2')).toBeInTheDocument();
    expect(screen.getByText('has a description')).toBeInTheDocument();
  });

  it('calls onToggle with the flipped completion state when the checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const tasks = [makeTask({ id: 7, title: 'Toggle me', is_complete: false })];
    render(<TaskList tasks={tasks} onToggle={onToggle} onDelete={vi.fn()} />);

    await user.click(screen.getByLabelText('Toggle Toggle me'));

    expect(onToggle).toHaveBeenCalledWith(7, true);
  });

  it('calls onDelete with the task id when Delete is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const tasks = [makeTask({ id: 3, title: 'Delete me' })];
    render(<TaskList tasks={tasks} onToggle={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByLabelText('Delete Delete me'));

    expect(onDelete).toHaveBeenCalledWith(3);
  });

  it('applies strikethrough styling to completed tasks', () => {
    const tasks = [makeTask({ id: 9, title: 'Done task', is_complete: true })];
    render(<TaskList tasks={tasks} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Done task')).toHaveStyle({ textDecoration: 'line-through' });
  });
});
