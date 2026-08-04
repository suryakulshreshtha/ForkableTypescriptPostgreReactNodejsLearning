import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogSessionForm } from '../components/LogSessionForm';
import { Meditation } from '../types/meditation';

const meditations: Meditation[] = [
  {
    id: 1,
    title: 'Morning Sit',
    category: 'sitting',
    duration_minutes: 15,
    description: null,
    audio_url: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('LogSessionForm', () => {
  it('shows a validation error when name is missing', async () => {
    const user = userEvent.setup();
    const onLogSession = vi.fn();
    render(
      <LogSessionForm
        meditations={meditations}
        practicedBy=""
        onPracticedByChange={vi.fn()}
        onLogSession={onLogSession}
      />
    );

    await user.selectOptions(screen.getByLabelText('Choose meditation'), '1');
    await user.click(screen.getByRole('button', { name: 'Log Session' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Please enter your name');
    expect(onLogSession).not.toHaveBeenCalled();
  });

  it('shows a validation error when no meditation is chosen', async () => {
    const user = userEvent.setup();
    const onLogSession = vi.fn();
    render(
      <LogSessionForm
        meditations={meditations}
        practicedBy="Alex"
        onPracticedByChange={vi.fn()}
        onLogSession={onLogSession}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Log Session' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Please choose a meditation');
    expect(onLogSession).not.toHaveBeenCalled();
  });

  it('calls onLogSession with the selected meditation, duration, and rating', async () => {
    const user = userEvent.setup();
    const onLogSession = vi.fn();
    render(
      <LogSessionForm
        meditations={meditations}
        practicedBy="Alex"
        onPracticedByChange={vi.fn()}
        onLogSession={onLogSession}
      />
    );

    await user.selectOptions(screen.getByLabelText('Choose meditation'), '1');
    await user.clear(screen.getByLabelText('Duration in minutes'));
    await user.type(screen.getByLabelText('Duration in minutes'), '20');
    await user.selectOptions(screen.getByLabelText('Coherence rating'), '4');
    await user.click(screen.getByRole('button', { name: 'Log Session' }));

    expect(onLogSession).toHaveBeenCalledWith(1, 20, 4);
  });

  it('pre-fills the meditation dropdown when selectedMeditationId is provided', () => {
    render(
      <LogSessionForm
        meditations={meditations}
        selectedMeditationId={1}
        practicedBy="Alex"
        onPracticedByChange={vi.fn()}
        onLogSession={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Choose meditation')).toHaveValue('1');
  });

  it('calls onPracticedByChange as the name field is typed', async () => {
    const user = userEvent.setup();
    const onPracticedByChange = vi.fn();
    render(
      <LogSessionForm
        meditations={meditations}
        practicedBy=""
        onPracticedByChange={onPracticedByChange}
        onLogSession={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText('Your name'), 'A');

    expect(onPracticedByChange).toHaveBeenCalledWith('A');
  });
});
