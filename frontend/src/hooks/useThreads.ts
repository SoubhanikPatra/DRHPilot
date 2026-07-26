import { useState, useCallback } from 'react'
import { threadsApi, type Thread } from '@/lib/api'

export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchThreads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await threadsApi.list()
      setThreads(data)
    } catch {
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [])

  const createThread = useCallback(async (title?: string): Promise<Thread | null> => {
    try {
      const thread = await threadsApi.create(title)
      setThreads((prev) => [thread, ...prev])
      return thread
    } catch {
      setError('Failed to create conversation')
      return null
    }
  }, [])

  const deleteThread = useCallback(async (id: string) => {
    try {
      await threadsApi.delete(id)
      setThreads((prev) => prev.filter((t) => t.id !== id))
    } catch {
      setError('Failed to delete conversation')
    }
  }, [])

  return { threads, loading, error, fetchThreads, createThread, deleteThread }
}
