import { type ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

interface Props {
  children: ReactNode
}

export default function ProtectedRoute({ children }: Props) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    // Get current session synchronously from the client cache first.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    // Keep in sync with auth state changes (login / logout in other tabs).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Still loading — don't flash redirect.
  if (session === undefined) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
