/**
 * supabase.ts — singleton Supabase browser client.
 *
 * Import `supabase` everywhere; never call createClient() elsewhere.
 */

import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey)
