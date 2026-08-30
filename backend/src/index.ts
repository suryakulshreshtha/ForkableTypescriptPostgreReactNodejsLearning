import { createApp } from './app';
import { pool } from './db/pool';

const PORT = Number(process.env.PORT) || 4000;
// How long to let in-flight requests finish before forcing exit. Must be
// shorter than the orchestrator's own kill timeout (Kubernetes defaults to 30s)
// or the process gets killed mid-drain anyway.
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10_000;

const app = createApp(pool);

const server = app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

/**
 * Graceful shutdown.
 *
 * Without this, every deploy severed in-flight requests: the container runtime
 * sends SIGTERM, nothing handles it, the default action kills the process, and
 * any request mid-flight becomes a client-side error. Pooled Postgres
 * connections were never closed either, so the server saw them time out rather
 * than close cleanly.
 *
 * Order matters: stop accepting new connections first, let open ones finish,
 * then close the pool. Closing the pool first would fail the very requests we
 * are trying to drain.
 */
let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return; // a second Ctrl-C must not race the first
  shuttingDown = true;
  console.log(`${signal} received, draining connections...`);

  // Belt and braces: if a long-lived connection refuses to close, exit anyway
  // rather than hanging until the runtime SIGKILLs us.
  const forced = setTimeout(() => {
    console.error('drain timed out, exiting anyway');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forced.unref();

  server.close(async (err) => {
    if (err) console.error('error while closing server', err);
    try {
      await pool.end();
      console.log('shutdown complete');
      process.exit(err ? 1 : 0);
    } catch (poolErr) {
      console.error('error while closing the connection pool', poolErr);
      process.exit(1);
    }
  });
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => shutdown(signal));
}
