type EnvName = 'VITE_API_BASE_URL' | 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'

function readRequiredEnv(name: EnvName, value: string | undefined): string {
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`)
	}

	return value
}

export const env = {
	apiBaseUrl: readRequiredEnv('VITE_API_BASE_URL', import.meta.env.VITE_API_BASE_URL),
	supabaseUrl: readRequiredEnv(
		'VITE_SUPABASE_URL',
		import.meta.env.VITE_SUPABASE_URL,
	),
	supabaseAnonKey: readRequiredEnv(
		'VITE_SUPABASE_ANON_KEY',
		import.meta.env.VITE_SUPABASE_ANON_KEY,
	),
} as const
