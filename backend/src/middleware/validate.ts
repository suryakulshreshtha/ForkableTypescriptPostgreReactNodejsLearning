import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

/**
 * Validate a request part against a Zod schema before the controller runs.
 *
 * Every controller previously repeated the same hand-rolled if-chain: check
 * presence, check type, check range, return a 400 with a bespoke message. That
 * is ~30 lines per controller that drift apart over time, and the matching
 * TypeScript interface had to be maintained separately -- so the compiler could
 * not tell you when the two disagreed.
 *
 * A schema fixes both problems: it is the single source of truth for the shape,
 * and `z.infer` derives the type from it, so they cannot diverge.
 *
 * The parsed (and coerced) value replaces the raw one, so controllers receive
 * data that is already the right type. Unknown keys are stripped by default,
 * which stops a client from smuggling extra columns into an INSERT.
 */
export function validate(schema: ZodType, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // Report every problem at once. Returning only the first means a client
      // fixing a three-field form needs three round trips to find that out.
      res.status(400).json({
        error: `Invalid request ${source}`,
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.') || source,
          message: issue.message,
        })),
      });
      return;
    }

    // `query` and `params` are getter-only on Express 5; assigning to a
    // property of the request object rather than replacing it keeps both
    // major versions working.
    Object.defineProperty(req, source, { value: result.data, writable: true });
    next();
  };
}
