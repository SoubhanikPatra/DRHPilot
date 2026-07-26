/**
 * api.ts — typed API client.
 *
 * Every method injects the Supabase JWT from the active session as a
 * Bearer token so the FastAPI auth middleware can verify it.
 *
 * Add domain-specific helpers here as the backend grows.
 */

import { http, type RequestOptions } from '@/lib/http'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Shared types (keep in sync with backend Pydantic schemas)
// ---------------------------------------------------------------------------

export interface Document {
  id: string
  title: string
  file_type: string
  status: 'pending' | 'processing' | 'ready' | 'error'
  created_at: string
}

export interface Chat {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  chat_id: string
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

// ---------------------------------------------------------------------------
// Auth header helper
// ---------------------------------------------------------------------------

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

async function authed(opts?: RequestOptions): Promise<RequestOptions> {
  return { ...opts, headers: { ...(await authHeaders()), ...opts?.headers } }
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
    return http.post('/api/documents/ingest', undefined, {
      ...(await authed()),
      body,
    })
  },

  delete: async (id: string): Promise<void> =>
    http.delete(`/api/documents/${id}`, await authed()),
}

// ---------------------------------------------------------------------------
// Chats
// ---------------------------------------------------------------------------

export const chatsApi = {
  list: async (): Promise<Chat[]> => http.get('/api/chats', await authed()),

  create: async (title?: string): Promise<Chat> =>
    http.post('/api/chats', { title: title ?? 'New chat' }, await authed()),

  delete: async (id: string): Promise<void> =>
    http.delete(`/api/chats/${id}`, await authed()),

  messages: async (chatId: string): Promise<Message[]> =>
    http.get(`/api/chats/${chatId}/messages`, await authed()),

  /**
   * Send a message and return the raw Response so the caller can
   * consume the SSE stream directly with a ReadableStream reader.
   */
  sendMessage: async (chatId: string, content: string): Promise<Response> => {
    const { apiBaseUrl } = await import('@/lib/env').then((m) => m.env)
    const headers = await authHeaders()
    return fetch(`${apiBaseUrl}/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ content }),
    })
  },
}
