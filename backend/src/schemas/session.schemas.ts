import { z } from 'zod';

/**
 * The shape of a session request, in one place.
 *
 * These replace the hand-rolled if-chains in sessions.controller.ts. The rules
 * are identical -- deliberately so, since the integration tests assert on them
 * -- but they now live next to each other where a mismatch with the database
 * CHECK constraints is visible.
 */
export const logSessionSchema = z
  .object({
    meditation_id: z.number().int('meditation_id must be an integer'),
    practiced_by: z
      .string()
      .trim()
      .min(1, 'practiced_by is required and must be a non-empty string')
      // Matches practice_sessions.practiced_by VARCHAR(100). Without this the
      // database raises a 22001 and the client gets an opaque 500.
      .max(100, 'practiced_by must be 100 characters or fewer'),
    duration_minutes: z
      .number()
      .int('duration_minutes must be a positive integer')
      .positive('duration_minutes must be a positive integer'),
    coherence_rating: z
      .number()
      .int('coherence_rating must be an integer between 1 and 5')
      .min(1, 'coherence_rating must be an integer between 1 and 5')
      .max(5, 'coherence_rating must be an integer between 1 and 5')
      .nullish(),
  })
  .strict();

/**
 * Keyset pagination. `before` is the completed_at of the last row the client
 * saw, which is stable under inserts in a way OFFSET is not: with OFFSET, a
 * session logged between page 1 and page 2 shifts every subsequent row and the
 * client silently sees a duplicate.
 */
export const listSessionsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    before: z.coerce.date().optional(),
  })
  .strict();

export const practicedByParamsSchema = z.object({
  practicedBy: z.string().trim().min(1).max(100),
});

export type LogSessionBody = z.infer<typeof logSessionSchema>;
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;
