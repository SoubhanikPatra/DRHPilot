/**
 * api.ts — typed API client.
 *
 * Every method injects the Supabase JWT from the active session as a
 * Bearer token so the FastAPI auth middleware can verify it.
 */

import { http, type RequestOptions } from '@/lib/http'
import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'

// ---------------------------------------------------------------------------
// Shared types (keep in sync with backend Pydantic schemas)
// ---------------------------------------------------------------------------

export interface Thread {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  thread_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  citations?: Citation[]
}

export interface Citation {
  index: number
  document_id: string
  document_title: string
  chunk_excerpt: string
}

export interface Document {
  id: string
  title: string
  file_type: string
  status: 'pending' | 'processing' | 'ready' | 'error'
  created_at: string
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

async function authed(opts?: RequestOptions): Promise<RequestOptions> {
  return { ...opts, headers: { ...(await authHeaders()), ...opts?.headers } }
}

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------

export const threadsApi = {
  list: async (): Promise<Thread[]> =>
    http.get('/api/threads', await authed()),

  create: async (title = 'New conversation'): Promise<Thread> =>
    http.post('/api/threads', { title }, await authed()),

  delete: async (id: string): Promise<void> =>
    http.delete(`/api/threads/${id}`, await authed()),

  messages: async (threadId: string): Promise<Message[]> =>
    http.get(`/api/threads/${threadId}/messages`, await authed()),

  /** Returns raw Response for SSE stream consumption. */
  stream: async (threadId: string, content: string): Promise<Response> => {
    const headers = await authHeaders()
    return fetch(`${env.apiBaseUrl}/api/threads/${threadId}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ content }),
    })
  },
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export const documentsApi = {
  list: async (): Promise<Document[]> =>
    http.get('/api/documents', await authed()),

  ingest: async (file: File): Promise<Document> => {
    const body = new FormData()
    body.append('file', file)
    return http.post('/api/documents/ingest', undefined, { ...(await authed()), body })
  },

  delete: async (id: string): Promise<void> =>
    http.delete(`/api/documents/${id}`, await authed()),
}
