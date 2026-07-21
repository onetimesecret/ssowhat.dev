<!-- src/lib/sso-demos/shared/live/LiveStatusPill.svelte -->
<script lang="ts">
	import type { BackendStatus } from './session.svelte.js';

	/**
	 * Backend status dot + label shown while transport is live. Renders
	 * nothing for the 'unknown' state (nothing probed yet). Becomes a retry
	 * button when the backend is offline.
	 */

	interface Props {
		/** Backend reachability status */
		backend: BackendStatus;
		/** Re-probe callback for the offline state */
		onretry?: () => void;
	}

	let { backend, onretry }: Props = $props();
</script>

{#if backend === 'checking'}
	<span class="flex items-center gap-1.5 text-xs text-ink-tertiary">
		<span class="h-2 w-2 animate-pulse rounded-full bg-amber-400 motion-reduce:animate-none" aria-hidden="true"></span>
		checking&hellip;
	</span>
{:else if backend === 'online'}
	<span class="flex items-center gap-1.5 text-xs text-ink-tertiary">
		<span class="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true"></span>
		connected
	</span>
{:else if backend === 'offline'}
	<button
		onclick={onretry}
		aria-label="Live backend offline — retry connection"
		class="flex items-center gap-1.5 rounded text-xs text-amber-200 transition-colors motion-reduce:transition-none hover:text-amber-100 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
	>
		<span class="h-2 w-2 rounded-full bg-red-400" aria-hidden="true"></span>
		offline &mdash; retry
	</button>
{/if}
