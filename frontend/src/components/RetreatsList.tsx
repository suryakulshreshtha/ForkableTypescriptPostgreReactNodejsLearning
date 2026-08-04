import { Retreat } from '../types/retreat';

interface RetreatsListProps {
  retreats: Retreat[];
  onRegister: (id: number) => void;
}

export function RetreatsList({ retreats, onRegister }: RetreatsListProps) {
  if (retreats.length === 0) {
    return <p>No upcoming retreats.</p>;
  }

  return (
    <ul aria-label="Upcoming retreats">
      {retreats.map((r) => {
        const isFull = r.registered_count >= r.capacity;
        return (
          <li key={r.id} data-testid={`retreat-${r.id}`}>
            <strong>{r.title}</strong> — {r.location} ({r.retreat_type})
            <p>
              {r.start_date} to {r.end_date}
            </p>
            <p>
              {r.registered_count} / {r.capacity} registered
            </p>
            <button onClick={() => onRegister(r.id)} disabled={isFull}>
              {isFull ? 'Full' : 'Register'}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
