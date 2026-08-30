-- 003_indexes_and_updated_at.sql
--
-- Two corrections to 001, both found by reading the queries next to the schema.
-- Idempotent, like 001, so it is safe to re-run against any environment.

-- 1. The index did not match the query.
--
--    Both hot paths filter on practiced_by AND order/range on completed_at:
--      SELECT ... WHERE practiced_by = $1 ORDER BY completed_at DESC LIMIT $3
--      SELECT DISTINCT (completed_at ...)::date WHERE practiced_by = $1
--
--    A single-column index on practiced_by can satisfy the filter but not the
--    ordering, so Postgres still sorts every matching row. The composite index
--    serves both, and DESC matches the query's direction so the scan runs
--    forwards.
--
--    The old single-column index becomes redundant: a composite index on
--    (a, b) already serves any query that a lone index on (a) would.
CREATE INDEX IF NOT EXISTS idx_sessions_practiced_by_completed_at
    ON practice_sessions (practiced_by, completed_at DESC);

DROP INDEX IF EXISTS idx_sessions_practiced_by;

-- 2. meditations.updated_at was never maintained.
--
--    The column defaults to NOW() on insert and nothing ever touched it again,
--    so it was permanently equal to created_at -- a column that looks like data
--    and is actually a lie. A trigger is the only way to guarantee it, because
--    application code can always forget.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meditations_set_updated_at ON meditations;
CREATE TRIGGER meditations_set_updated_at
    BEFORE UPDATE ON meditations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
