import { useState, useCallback } from 'react'
import { threadsApi } from '@/lib/api'

export function useStream(threadId: string, onDone: () => void) {
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = useCallback(async (content: string) => {
    setError(null)
    setStreamingText('')
    setIsStreaming(true)

    try {
      const response = await threadsApi.stream(threadId, content)

      if (!response.ok || !response.body) {
        throw new Error(`Stream failed: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          try {
            const parsed = JSON.parse(raw)
            if (parsed.done) break
            if (typeof parsed.delta === 'string') {
              setStreamingText((prev) => prev + parsed.delta)
            }
          } catch {
            // malformed chunk — skip
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stream error')
    } finally {
      setIsStreaming(false)
      setStreamingText('')
      onDone()
    }
  }, [threadId, onDone])

  return { streamingText, isStreaming, error, send }
}
