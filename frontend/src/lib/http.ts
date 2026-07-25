import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'

export class ApiError extends Error {
	status: number
	isNetworkError: boolean
	body: unknown

	constructor(message: string, options: { status?: number; body?: unknown; isNetworkError?: boolean } = {}) {
		super(message)
		this.name = 'ApiError'
		this.status = options.status ?? 0
		this.body = options.body
		this.isNetworkError = options.isNetworkError ?? false
	}
}

type RequestOptions = Omit<RequestInit, 'body'> & {
	body?: BodyInit | Record<string, unknown> | null
}

function resolveUrl(path: string): string {
	return new URL(path, env.apiBaseUrl.endsWith('/') ? env.apiBaseUrl : `${env.apiBaseUrl}/`).toString()
}

async function getAccessToken(): Promise<string | null> {
	const { data, error } = await supabase.auth.getSession()

	if (error) {
		throw new ApiError(error.message)
	}

	return data.session?.access_token ?? null
}

function serializeBody(body: RequestOptions['body']): BodyInit | undefined {
	if (body == null) {
		return undefined
	}

	if (typeof body === 'string' || body instanceof FormData || body instanceof URLSearchParams || body instanceof Blob) {
		return body
	}

	return JSON.stringify(body)
}

function mergeHeaders(headers: HeadersInit | undefined, token: string | null, hasBody: boolean): Headers {
	const merged = new Headers(headers)

	merged.set('Accept', 'application/json')

	if (token) {
		merged.set('Authorization', `Bearer ${token}`)
	}

	if (hasBody && !merged.has('Content-Type')) {
		merged.set('Content-Type', 'application/json')
	}

	return merged
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const token = await getAccessToken()
	const body = serializeBody(options.body)
	const headers = mergeHeaders(options.headers, token, body !== undefined)

	let response: Response

	try {
		response = await fetch(resolveUrl(path), {
			...options,
			body,
			headers,
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Network request failed'
		throw new ApiError(message, { isNetworkError: true })
	}

	if (!response.ok) {
		let errorBody: unknown = undefined
		let message = `${response.status} ${response.statusText}`

		const contentType = response.headers.get('content-type') ?? ''

		if (contentType.includes('application/json')) {
			errorBody = await response.json().catch(() => undefined)
			if (errorBody && typeof errorBody === 'object') {
				const record = errorBody as Record<string, unknown>
				const detail = record.detail ?? record.message

				if (typeof detail === 'string') {
					message = detail
				}
			}
		} else {
			const text = await response.text().catch(() => '')
			if (text) {
				message = text
			}
		}

		throw new ApiError(message, {
			body: errorBody,
			status: response.status,
		})
	}

	if (response.status === 204) {
		return undefined as T
	}

	const contentType = response.headers.get('content-type') ?? ''

	if (contentType.includes('application/json')) {
		return (await response.json()) as T
	}

	return (await response.text()) as T
}
