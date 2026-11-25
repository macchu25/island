import { z } from 'zod';

export const ERROR_CODES = [
  'VALIDATION', 'UNAUTHORIZED', 'INVALID_CREDENTIALS', 'EMAIL_TAKEN', 'DISPLAY_NAME_TAKEN',
  'UNKNOWN_CHEMICAL', 'INSUFFICIENT_MONSTERS', 'SLOTS_FULL', 'NOT_READY', 'NOT_FOUND',
  'EXTRACTOR_COOLDOWN', 'EXTRACTOR_CAP', 'EXTRACTOR_NOT_ELIGIBLE', 'INSUFFICIENT_COINS', 'INTERNAL',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
export const ErrorCodeSchema = z.enum(ERROR_CODES);

export const ApiErrorBodySchema = z.object({
  error: z.object({ code: ErrorCodeSchema, message: z.string(), details: z.record(z.string(), z.number()).optional() }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
