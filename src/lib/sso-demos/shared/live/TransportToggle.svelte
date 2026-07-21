<!-- src/lib/sso-demos/shared/live/TransportToggle.svelte -->
<script lang="ts">
	import type { BackendStatus } from './session.svelte.js';
	import LiveStatusPill from './LiveStatusPill.svelte';

	/**
	 * Static/Live segmented transport control with the embedded status pill
	 * and, once a live session exists, a New session button. Rendered in the
	 * shell's navBar only for demos with a live config, in interactive mode.
	 */

	interface Props {
		/** Current transport mode */
		transport: 'static' | 'live';
		/** Backend reachability status, for the embedded pill */
		backend: BackendStatus;
		/** Current live session id; New session renders only when one exists */
		sessionId: string | null;
		/** Called with the requested transport mode */
		onchange: (transport: 'static' | 'live') => void;
		/** Re-probe callback for the offline pill */
		onretry: () => void;
		/** Mints a fresh live session (new UUID, cleared results/captures) */
		onnewsession: () => void;
	}

	let { transport, backend, sessionId, onchange, onretry, onnewsession }: Props = $props();

	const NEUTRAL =
		'border-edge bg-transparent text-ink-tertiary hover:border-edge-emphasis hover:text-ink-secondary';
</script>

<div class="flex items-center gap-2 print:hidden">
	<div role="group" aria-label="Transport" class="flex items-center gap-1">
		<button
			onclick={() => onchange('static')}
			aria-pressed={transport === 'static'}
			class="rounded-md border px-3 py-2 text-xs font-medium transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface {transport ===
			'static'
				? 'border-edge-emphasis bg-surface-raised text-ink-secondary'
				: NEUTRAL}"
		>
			Static
		</button>
		<button
			onclick={() => onchange('live')}
			aria-pressed={transport === 'live'}
			class="rounded-md border px-3 py-2 text-xs font-medium transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface {transport ===
			'live'
				? 'border-emerald-500/50 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'
				: NEUTRAL}"
		>
			Live
		</button>
	</div>
	{#if transport === 'live'}
		<LiveStatusPill {backend} {onretry} />
		{#if sessionId}
			<button
				onclick={onnewsession}
				class="rounded-md border border-edge bg-transparent px-2 py-1 text-xs font-medium text-ink-tertiary transition-colors motion-reduce:transition-none hover:border-edge-emphasis hover:text-ink-secondary focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
			>
				New session
			</button>
		{/if}
	{/if}
</div>
