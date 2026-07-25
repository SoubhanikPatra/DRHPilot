import { requestJson } from '@/lib/http'

export type ThreadSummary = {
	id: string
	title: string
	messageCount?: number
	preview?: string | null
	updatedAt?: string
}

export type Citation = {
	id: string
	companyName?: string | null
	filingType?: string | null
	filingDate?: string | null
	pageLabel?: string | null
	pageNumber?: number | null
	snippet: string
	sourceUrl?: string | null
}

export type MessageRole = 'user' | 'assistant' | 'system'

export type ChatMessage = {
	id: string
	role: MessageRole
	content: string
	createdAt?: string
	citations?: Citation[]
}

export type ThreadDetail = ThreadSummary & {
	messages: ChatMessage[]
}

export type SendMessageInput = {
	threadId: string
	content: string
}

export async function listThreads(): Promise<ThreadSummary[]> {
	return requestJson<ThreadSummary[]>('/chat/threads')
}

export async function createThread(title?: string): Promise<ThreadSummary> {
	return requestJson<ThreadSummary>('/chat/threads', {
		body: {
			title: title?.trim() || 'New thread',
		},
		method: 'POST',
	})
}

export async function getThread(threadId: string): Promise<ThreadDetail> {
	return requestJson<ThreadDetail>(`/chat/threads/${threadId}`)
}

export async function sendMessage(input: SendMessageInput): Promise<ThreadDetail> {
	return requestJson<ThreadDetail>('/chat/stream', {
		body: {
			messages: [
				{
					content: input.content,
					role: 'user',
				},
			],
			threadId: input.threadId,
		},
		method: 'POST',
	})
}
