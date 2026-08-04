-- 002_seed_sample_data.sql
-- Optional sample data for local development and demos. Not required by
-- the app or the test suite — every integration test truncates its own
-- tables before running, so seeded rows never affect test results.
--
-- All titles, stories, and events below are invented for this example and
-- are not drawn from any real course, retreat, or person's story.
--
-- Wrapped in a guard so it's safe to re-run: it's a no-op if meditations
-- already exist (e.g. if you run this twice against the same database).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM meditations LIMIT 1) THEN
    INSERT INTO meditations (title, category, duration_minutes, description) VALUES
      ('Settling Into Stillness', 'sitting', 20, 'A seated practice for quieting the mind and settling into presence.'),
      ('Mindful Steps Practice', 'walking', 15, 'A moving meditation for building body awareness step by step.'),
      ('Evening Wind-Down', 'lying', 25, 'A lying-down practice to release the day and prepare for rest.'),
      ('Standing Energy Reset', 'standing', 10, 'A short standing practice to shift energy and refocus attention.'),
      ('Heart-Centered Breathing', 'sitting', 12, 'A breath-focused seated practice for calm, centered awareness.');

    INSERT INTO retreats (title, location, retreat_type, start_date, end_date, capacity) VALUES
      ('Autumn Week Long Retreat', 'Asheville, North Carolina', 'Week Long', '2026-10-04', '2026-10-10', 120),
      ('Winter Progressive Retreat', 'Zurich, Switzerland', 'Progressive', '2026-12-11', '2026-12-13', 80),
      ('Spring Advanced Follow-Up', 'Sedona, Arizona', 'Advanced', '2027-03-05', '2027-03-08', 60);

    INSERT INTO testimonials (name, story, category) VALUES
      ('Priya', 'Three months of daily sitting practice completely changed how I handle stress at work.', 'consistency'),
      ('Marcus', 'The walking meditation helped me reconnect with my body during a long recovery.', 'healing'),
      ('Elena', 'I finally understand what it feels like to be calm and centered under pressure.', 'focus');
  END IF;
END $$;
