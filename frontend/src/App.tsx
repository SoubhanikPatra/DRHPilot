import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ArrowRight, Loader2, MessageSquareText, Search, Sparkles } from 'lucide-react'

import { AuthLayout } from '@/components/auth/auth-layout'
import { LoginCard } from '@/components/auth/login-card'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { listThreads, type ThreadSummary } from '@/lib/api'
import { supabase } from '@/lib/supabase'

function useSession() {
	const [isLoading, setIsLoading] = useState(true)
	const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] | null>(null)

	useEffect(() => {
		let mounted = true

		supabase.auth.getSession().then(({ data }) => {
			if (!mounted) {
				return
			}

			setSession(data.session)
			setIsLoading(false)
		})

		const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
			setSession(nextSession)
			setIsLoading(false)
		})

		return () => {
			mounted = false
			data.subscription.unsubscribe()
		}
	}, [])

	return { isLoading, session }
}

function LoginPage() {
	return (
		<AuthLayout>
			<div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
				<section className="space-y-6 text-slate-950">
					<div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-4 py-2 text-sm font-medium text-cyan-900 shadow-sm backdrop-blur">
						<Sparkles className="size-4" />
						Internal research assistant for Driftwood Capital
					</div>

					<div className="space-y-4">
						<h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-slate-950 md:text-6xl">
							Turn filings into cited answers in one place.
						</h1>
						<p className="max-w-xl text-lg leading-8 text-slate-600">
							DHRPilot is the analyst workspace for fast intake: search filings, preserve the source passage,
							and keep every conversation tied to the corpus.
						</p>
					</div>

					<div className="grid gap-4 sm:grid-cols-3">
						{[
							['Grounded', 'Every answer ties back to a filing passage.'],
							['Fast', 'Move from question to evidence without copy-paste.'],
							['Auditable', 'Saved threads and citation trails by user.'],
						].map(([title, body]) => (
							<div key={title} className="rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
								<p className="text-sm font-semibold text-slate-950">{title}</p>
								<p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
							</div>
						))}
					</div>
				</section>

				<div className="flex justify-center lg:justify-end">
					<LoginCard />
				</div>
			</div>
		</AuthLayout>
	)
}

function ThreadCard({ thread }: { thread: ThreadSummary }) {
	return (
		<button
			type="button"
			className="group w-full rounded-3xl border border-slate-800 bg-slate-900/70 p-4 text-left transition hover:border-cyan-400/50 hover:bg-slate-900"
		>
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="font-medium text-white">{thread.title}</p>
					<p className="mt-1 text-sm leading-6 text-slate-400">
						{thread.preview || 'No preview yet. Start the thread with a filing question.'}
					</p>
				</div>
				<ArrowRight className="mt-1 size-4 text-slate-500 transition group-hover:text-cyan-300" />
			</div>
			<div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-500">
				<span>{thread.messageCount ?? 0} messages</span>
				<span>{thread.updatedAt ? new Date(thread.updatedAt).toLocaleDateString() : 'Draft'}</span>
			</div>
		</button>
	)
}

function ChatHomePage() {
	const [threads, setThreads] = useState<ThreadSummary[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let mounted = true

		listThreads()
			.then((items) => {
				if (!mounted) {
					return
				}

				setThreads(items)
				setIsLoading(false)
			})
			.catch((exception: unknown) => {
				if (!mounted) {
					return
				}

				setError(exception instanceof Error ? exception.message : 'Failed to load threads')
				setIsLoading(false)
			})

		return () => {
			mounted = false
		}
	}, [])

	const recentThreads = useMemo(() => threads.slice(0, 4), [threads])

	return (
		<AppShell>
			<div className="flex-1 px-6 py-6 lg:px-10 lg:py-8">
				<header className="rounded-[2rem] border border-slate-800 bg-[linear-gradient(135deg,rgba(6,182,212,0.12),rgba(15,23,42,0.9))] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)] lg:p-8">
					<div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
						<div className="max-w-3xl space-y-4">
							<div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
								<MessageSquareText className="size-3.5" />
								Analyst workspace
							</div>
							<div>
								<h2 className="text-4xl font-semibold tracking-tight text-white">Ask a filing question.</h2>
								<p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
									Thread history, citations, and retrieval are wired into the product shell. Backend grounding comes next.
								</p>
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px] lg:grid-cols-1">
							<Button className="h-12 justify-between rounded-2xl bg-cyan-400 text-slate-950 hover:bg-cyan-300">
								New thread
								<ArrowRight className="size-4" />
							</Button>
							<Button variant="outline" className="h-12 justify-between rounded-2xl border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900">
								Search filings
								<Search className="size-4" />
							</Button>
						</div>
					</div>
				</header>

				<section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
					<div className="rounded-[2rem] border border-slate-800 bg-slate-950/80 p-6">
						<div className="flex items-center justify-between gap-4">
							<div>
								<h3 className="text-lg font-semibold text-white">Recent threads</h3>
								<p className="mt-1 text-sm text-slate-400">
									Your conversations will appear here once the backend returns saved threads.
								</p>
							</div>
							{isLoading ? <Loader2 className="size-4 animate-spin text-cyan-300" /> : null}
						</div>

						{error ? (
							<div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
								{error}
							</div>
						) : null}

						<div className="mt-6 grid gap-4">
							{!isLoading && recentThreads.length === 0 && !error ? (
								<div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center text-slate-400">
									No threads yet. Create one from the backend once the thread endpoints are live.
								</div>
							) : null}

							{recentThreads.map((thread) => (
								<ThreadCard key={thread.id} thread={thread} />
							))}
						</div>
					</div>

					<aside className="rounded-[2rem] border border-slate-800 bg-slate-950/80 p-6">
						<h3 className="text-lg font-semibold text-white">What’s ready</h3>
						<ul className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
							<li>• Email auth shell is wired against Supabase.</li>
							<li>• API client injects the bearer token for backend calls.</li>
							<li>• shadcn utilities and button primitives are installed.</li>
							<li>• The chat shell is ready for thread and citation rendering.</li>
						</ul>
					</aside>
				</section>
			</div>
		</AppShell>
	)
}

function AppRoutes() {
	const { isLoading, session } = useSession()

	if (isLoading) {
		return (
			<div className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">
				<Loader2 className="size-5 animate-spin text-cyan-300" />
			</div>
		)
	}

	return (
		<Routes>
			<Route path="/login" element={session ? <Navigate replace to="/" /> : <LoginPage />} />
			<Route path="/" element={session ? <ChatHomePage /> : <Navigate replace to="/login" />} />
			<Route path="*" element={<Navigate replace to={session ? '/' : '/login'} />} />
		</Routes>
	)
}

export default function App() {
	return (
		<BrowserRouter>
			<AppRoutes />
		</BrowserRouter>
	)
}
