import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { threadsApi, type Message } from '@/lib/api'
import { useThreads } from '@/hooks/useThreads'
import { useStream } from '@/hooks/useStream'
import ThreadSidebar from '@/components/ThreadSidebar'
import MessageList from '@/components/MessageList'
import ChatInput from '@/components/ChatInput'
import { supabase } from '@/lib/supabase'

export default function ChatPage() {
  const navigate = useNavigate()
  const { threadId } = useParams<{ threadId?: string }>()

  const { threads, loading: threadsLoading, fetchThreads, createThread, deleteThread } = useThreads()
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  // Fetch messages when threadId changes
  const loadMessages = useCallback(async (id: string) => {
    setMessagesLoading(true)
    try {
      const data = await threadsApi.messages(id)
      setMessages(data)
    } catch {
      setMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  // Called by useStream when the SSE stream finishes — reload persisted messages
  const onStreamDone = useCallback(() => {
    if (threadId) loadMessages(threadId)
  }, [threadId, loadMessages])

  const { streamingText, isStreaming, error: streamError, send } = useStream(
    threadId ?? '',
    onStreamDone,
  )

  // Initial load
  useEffect(() => { fetchThreads() }, [fetchThreads])

  // Load messages whenever active thread changes
  useEffect(() => {
    if (threadId) {
      loadMessages(threadId)
    } else {
      setMessages([])
    }
  }, [threadId, loadMessages])

  async function handleCreate() {
    const thread = await createThread()
    if (thread) navigate(`/threads/${thread.id}`)
  }

  async function handleDelete(id: string) {
    await deleteThread(id)
    if (id === threadId) navigate('/')
  }

  async function handleSend(content: string) {
    if (!threadId) return
    // Optimistically add the user message to the list
    const optimistic: Message = {
      id: crypto.randomUUID(),
      thread_id: threadId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    await send(content)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-svh overflow-hidden">
      <ThreadSidebar
        threads={threads}
        activeId={threadId ?? null}
        loading={threadsLoading}
        onSelect={(id) => navigate(`/threads/${id}`)}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-sm font-medium text-muted-foreground">
            {threadId
              ? (threads.find((t) => t.id === threadId)?.title ?? 'Conversation')
              : 'Select or start a conversation'}
          </span>
          <button
            onClick={handleSignOut}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </header>

        {/* Messages */}
        {threadId ? (
          <>
            {messagesLoading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : (
              <MessageList
                messages={messages}
                streamingText={streamingText}
                isStreaming={isStreaming}
              />
            )}
            {streamError && (
              <p className="px-4 pb-1 text-xs text-destructive">{streamError}</p>
            )}
            <ChatInput onSend={handleSend} disabled={isStreaming} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <p className="text-sm">No conversation selected.</p>
            <button
              onClick={handleCreate}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Start a new conversation
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
