import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeditationLibrary } from '../components/MeditationLibrary';
import { Meditation } from '../types/meditation';

const makeMeditation = (overrides: Partial<Meditation> = {}): Meditation => ({
  id: 1,
  title: 'Morning Sit',
  category: 'sitting',
  duration_minutes: 15,
  description: null,
  audio_url: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('MeditationLibrary', () => {
  it('renders all meditations by default', () => {
    const meditations = [
      makeMeditation({ id: 1, title: 'Morning Sit', category: 'sitting' }),
      makeMeditation({ id: 2, title: 'Evening Walk', category: 'walking' }),
    ];
    render(<MeditationLibrary meditations={meditations} onSelectForLogging={vi.fn()} />);

    expect(screen.getByTestId('meditation-1')).toBeInTheDocument();
    expect(screen.getByTestId('meditation-2')).toBeInTheDocument();
  });

  it('filters the list when a category is selected', async () => {
    const user = userEvent.setup();
    const meditations = [
      makeMeditation({ id: 1, title: 'Morning Sit', category: 'sitting' }),
      makeMeditation({ id: 2, title: 'Evening Walk', category: 'walking' }),
    ];
    render(<MeditationLibrary meditations={meditations} onSelectForLogging={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText('Filter by category'), 'walking');

    expect(screen.queryByTestId('meditation-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('meditation-2')).toBeInTheDocument();
  });

  it('shows an empty state when no meditations match the filter', async () => {
    const user = userEvent.setup();
    const meditations = [makeMeditation({ id: 1, category: 'sitting' })];
    render(<MeditationLibrary meditations={meditations} onSelectForLogging={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText('Filter by category'), 'lying');

    expect(screen.getByText('No meditations found in this category.')).toBeInTheDocument();
  });

  it('calls onSelectForLogging with the chosen meditation', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const meditation = makeMeditation({ id: 7, title: 'Pick Me' });
    render(<MeditationLibrary meditations={[meditation]} onSelectForLogging={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'Log a session' }));

    expect(onSelect).toHaveBeenCalledWith(meditation);
  });
});
