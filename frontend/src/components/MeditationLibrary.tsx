import { useState } from 'react';
import { Meditation, MeditationCategory, MEDITATION_CATEGORIES } from '../types/meditation';

interface MeditationLibraryProps {
  meditations: Meditation[];
  onSelectForLogging: (meditation: Meditation) => void;
}

export function MeditationLibrary({ meditations, onSelectForLogging }: MeditationLibraryProps) {
  const [categoryFilter, setCategoryFilter] = useState<MeditationCategory | 'all'>('all');

  const visible =
    categoryFilter === 'all' ? meditations : meditations.filter((m) => m.category === categoryFilter);

  return (
    <section aria-label="Meditation library">
      <label>
        Filter by category:{' '}
        <select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as MeditationCategory | 'all')}
        >
          <option value="all">All</option>
          {MEDITATION_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </label>

      {visible.length === 0 ? (
        <p>No meditations found in this category.</p>
      ) : (
        <ul aria-label="Meditations">
          {visible.map((m) => (
            <li key={m.id} data-testid={`meditation-${m.id}`}>
              <strong>{m.title}</strong> — {m.category}, {m.duration_minutes} min
              {m.description && <p>{m.description}</p>}
              <button onClick={() => onSelectForLogging(m)}>Log a session</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
