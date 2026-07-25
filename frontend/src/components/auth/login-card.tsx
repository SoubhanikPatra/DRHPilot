import { useState } from 'react'
import { Loader2, Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

type LoginCardProps = {
	onSuccess?: () => void
}

export function LoginCard({ onSuccess }: LoginCardProps) {
	const [email, setEmail] = useState('')
	const [message, setMessage] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setIsLoading(true)
		setMessage(null)

		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${window.location.origin}/`,
			},
		})

		setIsLoading(false)

		if (error) {
			setMessage(error.message)
			return
		}

		setMessage('Check your email for the sign-in link.')
		onSuccess?.()
	}

	return (
		<div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur">
			<div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-900">
				<Mail className="size-3.5" />
				Email only
			</div>

			<h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">Sign in to DHRPilot</h2>
			<p className="mt-3 text-sm leading-6 text-slate-600">
				Use your Driftwood email to get a magic link and access your saved conversations.
			</p>

			<form className="mt-8 space-y-4" onSubmit={handleSubmit}>
				<label className="block space-y-2 text-sm font-medium text-slate-700">
					<span>Email address</span>
					<input
						className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white"
						name="email"
						type="email"
						autoComplete="email"
						placeholder="analyst@driftwood.com"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						required
					/>
				</label>

				<Button className="h-12 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800" disabled={isLoading} type="submit">
					{isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
					Send magic link
				</Button>
			</form>

			{message ? (
				<p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
					{message}
				</p>
			) : null}
		</div>
	)
}
