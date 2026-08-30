import { Request, Response, NextFunction } from 'express';

/**
 * Errors that carry an HTTP status, as thrown by Express and its middleware.
 * `body-parser` sets `status`/`statusCode` and a machine-readable `type`.
 */
interface HttpishError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
  code?: string;
}

/**
 * Postgres SQLSTATE codes worth translating. Everything else is genuinely our
 * fault and stays a 500.
 */
const PG_STATUS: Record<string, [number, string]> = {
  '23505': [409, 'That record already exists'], // unique_violation
  '23503': [400, 'Referenced record does not exist'], // foreign_key_violation
  '23514': [400, 'A value violated a database constraint'], // check_violation
  '22001': [400, 'A value was too long for its field'], // string_data_right_truncation
  '22P02': [400, 'A value had the wrong type'], // invalid_text_representation
};

/**
 * Central error handler.
 *
 * Previously every error became a 500 with a full stack on stdout. That turned
 * a client's own mistake -- a 200kb request body, a duplicate key -- into "the
 * server is broken", which is both wrong and unactionable: the caller cannot
 * tell a bug from a bad request, and neither can the person reading the logs.
 *
 * A 4xx is still logged, at a lower level, because a spike in 400s is a signal
 * even though no single one is an incident.
 */
export function errorHandler(err: HttpishError, req: Request, res: Response, _next: NextFunction) {
  let status = err.status ?? err.statusCode ?? 500;
  let message = 'Internal server error';

  if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  } else if (err.code && PG_STATUS[err.code]) {
    [status, message] = PG_STATUS[err.code];
  } else if (status >= 400 && status < 500) {
    message = err.message || 'Bad request';
  }

  if (status >= 500) {
    // Only a real server fault deserves a stack trace.
    console.error(`${req.method} ${req.originalUrl} failed:`, err.stack);
  } else {
    console.warn(`${req.method} ${req.originalUrl} -> ${status}: ${err.message}`);
  }

  // The message is never the raw error for a 5xx: internal detail (table names,
  // driver internals, file paths) must not reach the client.
  res.status(status).json({ error: message });
}
