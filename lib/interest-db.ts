import { env } from 'cloudflare:workers';

export function interestDatabase(): D1Database {
  const binding = (env as { DB?: D1Database }).DB;
  if (!binding) throw new Error('Usage database is not configured');
  return binding;
}
