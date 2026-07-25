import type { ReactNode } from 'react'
import { Activity, Archive, LogOut, MessageSquare, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'

type AppShellProps = {
	children: ReactNode
}

const navItems = [
	{ icon: MessageSquare, label: 'Threads', active: true },
	{ icon: Search, label: 'Search corpus', active: false },
	{ icon: Archive, label: 'Sources', active: false },
	{ icon: Activity, label: 'Usage', active: false },
]

export function AppShell({ children }: AppShellProps) {
	return (
		<div className="min-h-screen bg-slate-950 text-slate-100">
			<div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
				<aside className="border-slate-800 bg-slate-950/90 px-6 py-6 backdrop-blur lg:border-r">
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="text-xs uppercase tracking-[0.34em] text-cyan-300">DHRPilot</p>
							<h1 className="mt-2 text-2xl font-semibold text-white">Document Copilot</h1>
						</div>
					</div>

					<div className="mt-8 space-y-2">
						{navItems.map((item) => (
							<button
								key={item.label}
								type="button"
								className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${item.active ? 'border-cyan-400/50 bg-cyan-400/10 text-white' : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'}`}
							>
								<item.icon className="size-4" />
								<span>{item.label}</span>
							</button>
						))}
					</div>

					<div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
						<p className="text-sm font-medium text-white">Pilot status</p>
						<p className="mt-2 text-sm leading-6 text-slate-300">
							Grounded answer shell, auth flow, and thread surface are ready. Retrieval and citations plug in next.
						</p>
						<Button className="mt-4 w-full justify-between rounded-2xl bg-cyan-400 text-slate-950 hover:bg-cyan-300">
							Open thread
							<MessageSquare className="size-4" />
						</Button>
					</div>

					<Button variant="ghost" className="mt-6 w-full justify-start gap-2 rounded-2xl text-slate-300 hover:bg-slate-900 hover:text-white">
						<LogOut className="size-4" />
						Sign out
					</Button>
				</aside>

				<main className="flex min-h-screen flex-col bg-slate-950">
					{children}
				</main>
			</div>
		</div>
	)
}
