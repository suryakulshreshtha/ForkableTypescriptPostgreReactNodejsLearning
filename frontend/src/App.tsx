import { useEffect, useState } from 'react';
import { Meditation } from './types/meditation';
import { Retreat } from './types/retreat';
import { Testimonial } from './types/testimonial';
import { StreakSummary } from './types/practiceSession';
import { meditationsApi } from './api/meditationsApi';
import { sessionsApi } from './api/sessionsApi';
import { retreatsApi } from './api/retreatsApi';
import { testimonialsApi } from './api/testimonialsApi';
import { MeditationLibrary } from './components/MeditationLibrary';
import { LogSessionForm } from './components/LogSessionForm';
import { StreakDashboard } from './components/StreakDashboard';
import { RetreatsList } from './components/RetreatsList';
import { TestimonialsList } from './components/TestimonialsList';

type Tab = 'library' | 'retreats' | 'stories';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('library');

  const [meditations, setMeditations] = useState<Meditation[]>([]);
  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  const [practicedBy, setPracticedBy] = useState('');
  const [streak, setStreak] = useState<StreakSummary | null>(null);
  const [streakLoading, setStreakLoading] = useState(false);
  const [selectedMeditationId, setSelectedMeditationId] = useState<number | undefined>(undefined);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (practicedBy.trim().length === 0) {
      setStreak(null);
      return;
    }
    const handle = setTimeout(() => refreshStreak(practicedBy), 300); // debounce typing
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practicedBy]);

  async function loadAll() {
    try {
      setLoading(true);
      const [m, r, t] = await Promise.all([
        meditationsApi.getAll(),
        retreatsApi.getAll(),
        testimonialsApi.getAll(),
      ]);
      setMeditations(m);
      setRetreats(r);
      setTestimonials(t);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function refreshStreak(name: string) {
    try {
      setStreakLoading(true);
      const summary = await sessionsApi.getStreak(name);
      setStreak(summary);
    } catch {
      // Non-fatal: streak panel just stays empty if this fails.
    } finally {
      setStreakLoading(false);
    }
  }

  async function handleLogSession(meditationId: number, durationMinutes: number, coherenceRating?: number) {
    await sessionsApi.logSession(meditationId, practicedBy.trim(), durationMinutes, coherenceRating);
    await refreshStreak(practicedBy.trim());
  }

  async function handleRegister(id: number) {
    try {
      const updated = await retreatsApi.register(id);
      setRetreats((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  }

  async function handleSubmitTestimonial(name: string, story: string) {
    const created = await testimonialsApi.submit(name, story);
    setTestimonials((prev) => [created, ...prev]);
  }

  return (
    <main>
      <h1>Mindful Practice</h1>
      <nav aria-label="Sections">
        <button onClick={() => setActiveTab('library')} aria-current={activeTab === 'library'}>
          Meditation Library
        </button>
        <button onClick={() => setActiveTab('retreats')} aria-current={activeTab === 'retreats'}>
          Retreats
        </button>
        <button onClick={() => setActiveTab('stories')} aria-current={activeTab === 'stories'}>
          Stories of Transformation
        </button>
      </nav>

      {loading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && activeTab === 'library' && (
        <>
          <LogSessionForm
            meditations={meditations}
            selectedMeditationId={selectedMeditationId}
            practicedBy={practicedBy}
            onPracticedByChange={setPracticedBy}
            onLogSession={handleLogSession}
          />
          <StreakDashboard practicedBy={practicedBy} streak={streak} loading={streakLoading} />
          <MeditationLibrary meditations={meditations} onSelectForLogging={(m) => setSelectedMeditationId(m.id)} />
        </>
      )}

      {!loading && activeTab === 'retreats' && <RetreatsList retreats={retreats} onRegister={handleRegister} />}

      {!loading && activeTab === 'stories' && (
        <TestimonialsList testimonials={testimonials} onSubmit={handleSubmitTestimonial} />
      )}
    </main>
  );
}

export default App;
