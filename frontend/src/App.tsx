import { useEffect, useState } from 'react';
import { Task } from './types/task';
import { tasksApi } from './api/tasksApi';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      const data = await tasksApi.getAll();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(title: string, description?: string) {
    const created = await tasksApi.create(title, description);
    setTasks((prev) => [created, ...prev]);
  }

  async function handleToggle(id: number, is_complete: boolean) {
    const updated = await tasksApi.toggleComplete(id, is_complete);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function handleDelete(id: number) {
    await tasksApi.remove(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <main>
      <h1>Tasks</h1>
      <TaskForm onCreate={handleCreate} />
      {loading && <p>Loading tasks…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && (
        <TaskList tasks={tasks} onToggle={handleToggle} onDelete={handleDelete} />
      )}
    </main>
  );
}

export default App;
