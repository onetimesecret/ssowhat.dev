<script lang="ts">
	// src/lib/sso-demos/shared/ActorDiagram.svelte

	import type { Actors, ActorConfig } from '../types.js';

	interface Props {
		/** Current active state of each actor */
		actors: Actors;
		/** Configuration for actors to display */
		actorConfig: ActorConfig[];
	}

	let { actors, actorConfig }: Props = $props();

	let ariaLabel = $derived(
		`Flow diagram showing: ${actorConfig.map((item) => item.label).join(' arrow ')}`
	);
</script>

<!--
  Horizontal strip showing which actors/components are active in the current step.
  Actors light up when active, providing visual context for the HTTP flow.
-->
<div class="mb-4 flex flex-wrap items-center gap-1" role="img" aria-label={ariaLabel}>
	{#each actorConfig as item, i}
		{@const isActive = actors[item.key]}
		<div
			class="flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-all {isActive
				? item.activeColor + ' border-2 border-white/40 text-white shadow-md'
				: 'border-2 border-dashed border-gray-500 bg-gray-700/50 text-gray-500'}"
		>
			{#if isActive}
				<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<circle cx="12" cy="12" r="8" />
				</svg>
			{:else}
				<svg
					class="h-3 w-3"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="8" />
				</svg>
			{/if}
			{item.label}
		</div>
		{#if i < actorConfig.length - 1}
			<div class="text-gray-400" aria-hidden="true">→</div>
		{/if}
	{/each}
</div>
