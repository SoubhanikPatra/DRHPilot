import { useEffect, useRef } from 'react'
import type { Message } from '@/lib/api'

interface Props {
  messages: Message[]
  streamingText: string
  isStreaming: boolean
}

export default function MessageList({ messages, streamingText, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Ask anything about the SEC filings.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}
          >
            {m.content}
          </div>
        </div>
      ))}

      {isStreaming && (
        <div className="flex justify-start">
          <div className="max-w-[75%] rounded-lg px-4 py-2.5 text-sm bg-muted text-foreground whitespace-pre-wrap">
            {streamingText || (
              <span className="inline-flex gap-1 text-muted-foreground">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse delay-75">●</span>
                <span className="animate-pulse delay-150">●</span>
              </span>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
