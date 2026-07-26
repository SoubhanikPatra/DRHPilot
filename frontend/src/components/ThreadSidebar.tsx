import type { Thread } from '@/lib/api'

interface Props {
  threads: Thread[]
  activeId: string | null
  loading: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
}

export default function ThreadSidebar({
  threads,
  activeId,
  loading,
  onSelect,
  onCreate,
  onDelete,
}: Props) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="text-sm font-semibold text-sidebar-foreground">DRHPilot</span>
        <button
          onClick={onCreate}
          className="rounded-md px-2 py-1 text-xs font-medium bg-primary text-primary-foreground hover:opacity-90"
        >
          + New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {loading && (
          <p className="px-2 py-4 text-xs text-muted-foreground text-center">Loading…</p>
        )}
        {!loading && threads.length === 0 && (
          <p className="px-2 py-4 text-xs text-muted-foreground text-center">
            No conversations yet
          </p>
        )}
        {threads.map((t) => (
          <div
            key={t.id}
            className={`group flex items-center justify-between rounded-md px-2 py-2 cursor-pointer ${
              t.id === activeId
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
            }`}
            onClick={() => onSelect(t.id)}
          >
            <span className="truncate text-sm">{t.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(t.id) }}
              className="ml-1 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-xs px-1"
              aria-label="Delete"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
