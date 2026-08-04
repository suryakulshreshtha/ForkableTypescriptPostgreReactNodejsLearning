import { FormEvent, useEffect, useState } from 'react';
import { Meditation } from '../types/meditation';

interface LogSessionFormProps {
  meditations: Meditation[];
  selectedMeditationId?: number;
  practicedBy: string;
  onPracticedByChange: (name: string) => void;
  onLogSession: (meditationId: number, durationMinutes: number, coherenceRating?: number) => Promise<void> | void;
}

export function LogSessionForm({
  meditations,
  selectedMeditationId,
  practicedBy,
  onPracticedByChange,
  onLogSession,
}: LogSessionFormProps) {
  const [meditationId, setMeditationId] = useState<number | ''>(selectedMeditationId ?? '');
  const [duration, setDuration] = useState('10');
  const [rating, setRating] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedMeditationId !== undefined) {
      setMeditationId(selectedMeditationId);
    }
  }, [selectedMeditationId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (practicedBy.trim().length === 0) {
      setError('Please enter your name');
      return;
    }
    if (meditationId === '') {
      setError('Please choose a meditation');
      return;
    }
    const durationNum = Number(duration);
    if (!Number.isInteger(durationNum) || durationNum <= 0) {
      setError('Duration must be a positive number of minutes');
      return;
    }

    setError(null);
    await onLogSession(meditationId, durationNum, rating ? Number(rating) : undefined);
    setRating('');
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Log practice session form">
      <input
        aria-label="Your name"
        placeholder="Your name"
        value={practicedBy}
        onChange={(e) => onPracticedByChange(e.target.value)}
      />
      <select
        aria-label="Choose meditation"
        value={meditationId}
        onChange={(e) => setMeditationId(e.target.value ? Number(e.target.value) : '')}
      >
        <option value="">Choose a meditation…</option>
        {meditations.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
      <input
        aria-label="Duration in minutes"
        type="number"
        min={1}
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
      />
      <select aria-label="Coherence rating" value={rating} onChange={(e) => setRating(e.target.value)}>
        <option value="">Rating (optional)</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <button type="submit">Log Session</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
