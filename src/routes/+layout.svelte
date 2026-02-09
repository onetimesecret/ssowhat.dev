<script lang="ts">
	import '../app.css';
	import { browser } from '$app/environment';

	let { children } = $props();

	/**
	 * Secure context gate.
	 *
	 * Demo components use crypto.randomUUID() for aria-controls IDs.
	 * That API is only available in secure contexts (HTTPS, localhost).
	 * On plain HTTP, the call throws and breaks Svelte hydration —
	 * producing an unrecoverable white-screen error.
	 *
	 * Rather than falling back to a weaker RNG (which would silently
	 * degrade the security posture of a site that teaches security
	 * concepts), we gate the entire app at the layout level. If the
	 * context isn't secure, we render a friendly error explaining how
	 * to fix it. No child components are mounted, so the failing code
	 * path is never reached.
	 *
	 * During SSR (!browser), the check passes unconditionally — Node
	 * always has crypto available regardless of the downstream
	 * transport.
	 */
	let isSecureContext = $derived(
		!browser || globalThis.isSecureContext
	);
</script>

{#if isSecureContext}
	{@render children()}
{:else}
	<!-- Secure context error: shown instead of children when crypto APIs are unavailable -->
	<div class="flex min-h-screen items-center justify-center px-6">
		<div class="max-w-md rounded-lg border border-edge bg-surface p-8 text-center">
			<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-900/30">
				<svg class="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			</div>
			<h1 class="text-lg font-semibold text-ink">Secure connection required</h1>
			<p class="mt-3 text-sm leading-relaxed text-ink-secondary">
				This site uses the <code class="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs">Web Crypto API</code>
				which requires a secure context. Access this page over
				<code class="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs">https://</code>
				or via <code class="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs">localhost</code>.
			</p>
			<p class="mt-4 text-xs text-ink-muted">
				Current URL: <span class="font-mono">{globalThis.location?.href}</span>
			</p>
		</div>
	</div>
{/if}
