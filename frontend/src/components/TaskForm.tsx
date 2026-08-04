import { FormEvent, useState } from 'react';

interface TaskFormProps {
  onCreate: (title: string, description?: string) => Promise<void> | void;
}

export function TaskForm({ onCreate }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (title.trim().length === 0) {
      setError('Title is required');
      return;
    }
    setError(null);
    await onCreate(title.trim(), description.trim() || undefined);
    setTitle('');
    setDescription('');
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Create task form">
      <input
        aria-label="Task title"
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        aria-label="Task description"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button type="submit">Add Task</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
