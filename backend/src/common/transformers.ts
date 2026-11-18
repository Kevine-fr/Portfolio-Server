import { Transform } from 'class-transformer';

/**
 * Converts an empty string to `null` so that optional fields can be cleared
 * from the admin (e.g. removing an end date or a URL). `@IsOptional()` then
 * skips the remaining validators for that field.
 */
export const EmptyToNull = () =>
  Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value));

/** Parses "true"/"false" query-string values; anything else becomes undefined. */
export function parseBooleanQuery(value: unknown): boolean | undefined {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return undefined;
}
