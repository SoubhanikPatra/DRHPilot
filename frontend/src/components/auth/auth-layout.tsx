import type { ReactNode } from 'react'

type AuthLayoutProps = {
	children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
	return (
		<div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.18),_transparent_25%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] text-slate-950">
			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
			<div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6 py-10">
				{children}
			</div>
		</div>
	)
}
