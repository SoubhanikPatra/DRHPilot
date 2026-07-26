/**
 * http.ts — lightweight fetch wrapper.
 *
 * Features:
 *  - Accepts a relative path (joined against env.apiBaseUrl) or absolute URL.
 *  - Merges default headers with caller-supplied headers.
 *  - Throws an HttpError (with status + parsed body) on non-2xx responses.
 *  - Returns the parsed JSON body for 2xx responses.
 *    For streaming endpoints (SSE) skip this wrapper and use fetch directly.
 */

import { env } from '@/lib/env'

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export type RequestOptions = Omit<RequestInit, 'body'> & {
  /** JSON-serialisable request body. */
  json?: unknown
}

async function request<T>(
  path: string,
  { json, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const url = path.startsWith('http')
    ? path
    : `${env.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : init.body,
  })

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text()
    }
    throw new HttpError(res.status, body, `HTTP ${res.status}: ${path}`)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

export const http = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'json'>) =>
    request<T>(path, { method: 'GET', ...opts }),

  post: <T>(path: string, json?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'POST', json, ...opts }),

  put: <T>(path: string, json?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'PUT', json, ...opts }),

  patch: <T>(path: string, json?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', json, ...opts }),

  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...opts }),
}
