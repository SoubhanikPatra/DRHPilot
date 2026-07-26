/**
 * env.ts — validate and export all VITE_ environment variables.
 * Throws at module load time if a required var is missing so the
 * problem surfaces immediately in dev, not at runtime.
 */

function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Add it to frontend/.env and restart the dev server.`,
    )
  }
  return value
}

export const env = {
  /** FastAPI base URL, e.g. http://localhost:8000 */
  apiBaseUrl: requireEnv('VITE_API_BASE_URL'),

  /** Supabase project URL */
  supabaseUrl: requireEnv('VITE_SUPABASE_URL'),

  /** Supabase anon/public key */
  supabaseAnonKey: requireEnv('VITE_SUPABASE_ANON_KEY'),
} as const
