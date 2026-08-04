import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskForm } from '../components/TaskForm';

describe('TaskForm', () => {
  it('calls onCreate with trimmed title and description on submit', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<TaskForm onCreate={onCreate} />);

    await user.type(screen.getByLabelText('Task title'), '  Buy milk  ');
    await user.type(screen.getByLabelText('Task description'), '  2%  ');
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(onCreate).toHaveBeenCalledWith('Buy milk', '2%');
  });

  it('omits description when left blank', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<TaskForm onCreate={onCreate} />);

    await user.type(screen.getByLabelText('Task title'), 'Just a title');
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(onCreate).toHaveBeenCalledWith('Just a title', undefined);
  });

  it('shows a validation error and does not call onCreate when title is empty', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<TaskForm onCreate={onCreate} />);

    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Title is required');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('clears the inputs after a successful submit', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<TaskForm onCreate={onCreate} />);

    const titleInput = screen.getByLabelText('Task title') as HTMLInputElement;
    await user.type(titleInput, 'Temporary title');
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(titleInput.value).toBe('');
  });
});
