<script lang="ts">
	/**
	 * OTS email-first sign-in screen for home-realm discovery.
	 * The user enters a work email; OTS resolves the domain to an IdP.
	 * The email value is configurable so demos can show different users
	 * mid-flow via thin wrapper variants (empty, Alice, Bob).
	 */
	let { email = '' }: { email?: string } = $props();
</script>

<div class="flex h-full items-center justify-center bg-surface">
	<div class="w-full max-w-sm rounded-lg border border-edge-emphasis bg-surface-raised p-8">
		<div class="mb-6 text-center">
			<div class="mb-2 text-3xl" aria-hidden="true">&#x1F510;</div>
			<h2 class="text-lg font-semibold text-ink">Sign in to Onetime Secret</h2>
			<p class="mt-1 text-sm text-ink-tertiary">Use your work email to continue</p>
		</div>
		<form onsubmit={(e) => e.preventDefault()}>
			<label for="discovery-email" class="mb-1 block text-sm font-medium text-ink-secondary">
				Work email
			</label>
			<input
				id="discovery-email"
				type="email"
				value={email}
				readonly
				placeholder="you@company.com"
				class="w-full rounded-lg border border-edge bg-code-surface px-3 py-2 text-ink placeholder-ink-tertiary focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
			/>
			<button
				type="submit"
				class="mt-4 w-full rounded-lg bg-emerald-600 py-2 font-medium text-white transition-colors hover:bg-emerald-500"
			>
				Continue
			</button>
		</form>
		<p class="mt-4 text-center text-xs text-ink-muted">
			We'll route you to your organization's sign-in page
		</p>
	</div>
</div>
