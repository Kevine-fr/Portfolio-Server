const DEV_FALLBACK_SECRET = 'dev_secret';

/**
 * JWT signing secret. In production a missing JWT_SECRET used to silently
 * fall back to a well-known value (anyone could forge admin tokens): we now
 * refuse to start instead.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return DEV_FALLBACK_SECRET;
}
