-- 001_create_practice_platform_tables.sql
-- Schema for a mindful-practice learning app: a meditation library, session
-- logging (used to compute practice streaks), retreat events with capacity
-- enforcement, and community testimonials.
--
-- Note: this is a generic, fictional domain modeled loosely on the *shape*
-- of meditation/personal-growth platforms in general (a library + session
-- tracking + ticketed events + testimonials) — it is not affiliated with,
-- and does not reproduce content from, any specific company or brand.
--
-- Idempotent so it's safe to run against a fresh dev or test database.

CREATE TABLE IF NOT EXISTS meditations (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    category        VARCHAR(20) NOT NULL CHECK (category IN ('sitting', 'standing', 'walking', 'lying')),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    description     TEXT,
    audio_url       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS practice_sessions (
    id                SERIAL PRIMARY KEY,
    meditation_id     INTEGER NOT NULL REFERENCES meditations(id) ON DELETE CASCADE,
    practiced_by      VARCHAR(100) NOT NULL,
    duration_minutes  INTEGER NOT NULL CHECK (duration_minutes > 0),
    coherence_rating  SMALLINT CHECK (coherence_rating BETWEEN 1 AND 5),
    completed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retreats (
    id                SERIAL PRIMARY KEY,
    title             VARCHAR(255) NOT NULL,
    location          VARCHAR(255) NOT NULL,
    retreat_type      VARCHAR(20) NOT NULL CHECK (retreat_type IN ('Progressive', 'Week Long', 'Advanced')),
    start_date        DATE NOT NULL,
    end_date          DATE NOT NULL CHECK (end_date >= start_date),
    capacity          INTEGER NOT NULL CHECK (capacity > 0),
    registered_count  INTEGER NOT NULL DEFAULT 0 CHECK (registered_count >= 0 AND registered_count <= capacity),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS testimonials (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    story         TEXT NOT NULL,
    category      VARCHAR(50),
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meditations_category ON meditations (category);
CREATE INDEX IF NOT EXISTS idx_sessions_practiced_by ON practice_sessions (practiced_by);
CREATE INDEX IF NOT EXISTS idx_sessions_meditation_id ON practice_sessions (meditation_id);
CREATE INDEX IF NOT EXISTS idx_retreats_start_date ON retreats (start_date);
