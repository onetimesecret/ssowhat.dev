<!-- src/lib/sso-demos/shared/live/DiffChips.svelte -->
<script lang="ts">
	import type { ExchangeDiff } from './diff.js';

	/**
	 * Chip strip for one static/live exchange pair: emerald chips for
	 * allowlisted (expected) differences, amber for unexpected drift, neutral
	 * for advisories. The identical state renders the byte-identical chip
	 * plus the map-and-territory lesson line. Pure presentational.
	 */

	interface Props {
		/** Diff result for the pair */
		diff: ExchangeDiff;
	}

	let { diff }: Props = $props();
</script>

{#if diff.identical}
	<div class="flex flex-wrap items-center gap-2">
		<span class="rounded border border-emerald-500/40 bg-emerald-900/30 px-1.5 font-mono text-[11px] text-emerald-400">
			byte-identical
		</span>
		<span class="text-xs text-ink-tertiary italic">
			An empty ListResponse contains no server-generated values &mdash; the map and the territory agree exactly here.
		</span>
	</div>
{:else}
	<div class="flex flex-wrap items-center gap-1.5">
		{#each diff.chips as chip (chip.kind + chip.path)}
			{#if chip.kind === 'expected'}
				<span class="rounded border border-emerald-500/40 bg-emerald-900/30 px-1.5 font-mono text-[11px] text-emerald-400">
					{chip.path}
				</span>
			{:else if chip.kind === 'unexpected'}
				<span class="rounded border border-amber-500/40 bg-amber-900/30 px-1.5 font-mono text-[11px] text-amber-400">
					unexpected: {chip.path}
				</span>
			{:else}
				<span class="rounded border border-edge bg-surface-raised px-1.5 font-mono text-[11px] text-ink-tertiary">
					{chip.path}
				</span>
			{/if}
		{/each}
	</div>
{/if}
