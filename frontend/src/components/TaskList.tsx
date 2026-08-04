import { Task } from '../types/task';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: number, is_complete: boolean) => void;
  onDelete: (id: number) => void;
}

export function TaskList({ tasks, onToggle, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return <p>No tasks yet — add one above.</p>;
  }

  return (
    <ul aria-label="Task list">
      {tasks.map((task) => (
        <li key={task.id} data-testid={`task-${task.id}`}>
          <label>
            <input
              type="checkbox"
              checked={task.is_complete}
              onChange={() => onToggle(task.id, !task.is_complete)}
              aria-label={`Toggle ${task.title}`}
            />
            <span style={{ textDecoration: task.is_complete ? 'line-through' : 'none' }}>
              {task.title}
            </span>
          </label>
          {task.description && <p>{task.description}</p>}
          <button onClick={() => onDelete(task.id)} aria-label={`Delete ${task.title}`}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
