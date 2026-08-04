import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { meditationsApi } from '../api/meditationsApi';
import { sessionsApi } from '../api/sessionsApi';
import { retreatsApi } from '../api/retreatsApi';
import { testimonialsApi } from '../api/testimonialsApi';

vi.mock('../api/meditationsApi', () => ({ meditationsApi: { getAll: vi.fn() } }));
vi.mock('../api/sessionsApi', () => ({ sessionsApi: { logSession: vi.fn(), getStreak: vi.fn() } }));
vi.mock('../api/retreatsApi', () => ({ retreatsApi: { getAll: vi.fn(), register: vi.fn() } }));
vi.mock('../api/testimonialsApi', () => ({ testimonialsApi: { getAll: vi.fn(), submit: vi.fn() } }));

const mockedMeditations = vi.mocked(meditationsApi);
const mockedSessions = vi.mocked(sessionsApi);
const mockedRetreats = vi.mocked(retreatsApi);
const mockedTestimonials = vi.mocked(testimonialsApi);

const meditationFixture = {
  id: 1,
  title: 'Morning Sit',
  category: 'sitting' as const,
  duration_minutes: 15,
  description: null,
  audio_url: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const retreatFixture = {
  id: 1,
  title: 'Autumn Retreat',
  location: 'Denver',
  retreat_type: 'Week Long' as const,
  start_date: '2026-10-01',
  end_date: '2026-10-07',
  capacity: 2,
  registered_count: 1,
  created_at: '2026-01-01T00:00:00Z',
};

const testimonialFixture = {
  id: 1,
  name: 'Jamie',
  story: 'It changed everything.',
  category: null,
  submitted_at: '2026-01-01T00:00:00Z',
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedMeditations.getAll.mockResolvedValue([meditationFixture]);
    mockedRetreats.getAll.mockResolvedValue([retreatFixture]);
    mockedTestimonials.getAll.mockResolvedValue([testimonialFixture]);
    mockedSessions.getStreak.mockResolvedValue({
      practiced_by: 'Alex',
      current_streak_days: 2,
      total_sessions: 4,
      total_minutes: 40,
    });
  });

  it('loads and displays the meditation library by default', async () => {
    render(<App />);
    expect(await screen.findByTestId('meditation-1')).toBeInTheDocument();
    expect(mockedMeditations.getAll).toHaveBeenCalledTimes(1);
  });

  it('switches to the retreats tab and shows retreat data', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByTestId('meditation-1');

    await user.click(screen.getByRole('button', { name: 'Retreats' }));

    expect(await screen.findByTestId('retreat-1')).toBeInTheDocument();
  });

  it('switches to the stories tab and shows testimonials', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByTestId('meditation-1');

    await user.click(screen.getByRole('button', { name: 'Stories of Transformation' }));

    expect(await screen.findByTestId('testimonial-1')).toBeInTheDocument();
  });

  it('logs a session and displays the refreshed streak', async () => {
    const user = userEvent.setup();
    mockedSessions.logSession.mockResolvedValueOnce(undefined);
    render(<App />);
    await screen.findByTestId('meditation-1');

    await user.type(screen.getByLabelText('Your name'), 'Alex');
    await user.selectOptions(screen.getByLabelText('Choose meditation'), '1');
    await user.click(screen.getByRole('button', { name: 'Log Session' }));

    await waitFor(() => expect(mockedSessions.logSession).toHaveBeenCalledWith(1, 'Alex', 10, undefined));
    expect(await screen.findByTestId('current-streak')).toHaveTextContent('Current streak: 2 days');
  });

  it('registers for a retreat and updates the displayed count', async () => {
    const user = userEvent.setup();
    mockedRetreats.register.mockResolvedValueOnce({ ...retreatFixture, registered_count: 2 });
    render(<App />);
    await screen.findByTestId('meditation-1');
    await user.click(screen.getByRole('button', { name: 'Retreats' }));
    await screen.findByTestId('retreat-1');

    await user.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => expect(screen.getByText('2 / 2 registered')).toBeInTheDocument());
  });

  it('submits a testimonial and adds it to the list', async () => {
    const user = userEvent.setup();
    mockedTestimonials.submit.mockResolvedValueOnce({
      id: 2,
      name: 'Taylor',
      story: 'New story here',
      category: null,
      submitted_at: '2026-01-02T00:00:00Z',
    });
    render(<App />);
    await screen.findByTestId('meditation-1');
    await user.click(screen.getByRole('button', { name: 'Stories of Transformation' }));
    await screen.findByTestId('testimonial-1');

    await user.type(screen.getByLabelText('Your name'), 'Taylor');
    await user.type(screen.getByLabelText('Your story'), 'New story here');
    await user.click(screen.getByRole('button', { name: 'Share Story' }));

    expect(await screen.findByTestId('testimonial-2')).toBeInTheDocument();
  });

  it('shows an error message when the initial load fails', async () => {
    mockedMeditations.getAll.mockRejectedValueOnce(new Error('network down'));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('network down');
  });
});
