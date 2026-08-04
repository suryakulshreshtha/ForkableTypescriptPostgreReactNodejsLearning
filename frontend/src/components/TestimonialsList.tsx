import { FormEvent, useState } from 'react';
import { Testimonial } from '../types/testimonial';

interface TestimonialsListProps {
  testimonials: Testimonial[];
  onSubmit: (name: string, story: string) => Promise<void> | void;
}

export function TestimonialsList({ testimonials, onSubmit }: TestimonialsListProps) {
  const [name, setName] = useState('');
  const [story, setStory] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length === 0 || story.trim().length === 0) {
      setError('Please fill in both your name and your story');
      return;
    }
    setError(null);
    await onSubmit(name.trim(), story.trim());
    setName('');
    setStory('');
  }

  return (
    <section aria-label="Stories of transformation">
      <form onSubmit={handleSubmit} aria-label="Submit testimonial form">
        <input aria-label="Your name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea
          aria-label="Your story"
          placeholder="Share your story…"
          value={story}
          onChange={(e) => setStory(e.target.value)}
        />
        <button type="submit">Share Story</button>
        {error && <p role="alert">{error}</p>}
      </form>

      {testimonials.length === 0 ? (
        <p>No stories yet — be the first to share.</p>
      ) : (
        <ul aria-label="Testimonials">
          {testimonials.map((t) => (
            <li key={t.id} data-testid={`testimonial-${t.id}`}>
              <strong>{t.name}</strong>
              <p>{t.story}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
