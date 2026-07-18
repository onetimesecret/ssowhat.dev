<script lang="ts">
	// src/lib/sso-demos/shared/ActorDiagram.svelte

	import type { Actors, ActorConfig } from '../types.js';
	import { getActorColorInfo } from './transcript-utils.js';

	interface Props {
		/** Current active state of each actor */
		actors: Actors;
		/** Configuration for actors to display */
		actorConfig: ActorConfig[];
	}

	let { actors, actorConfig }: Props = $props();

	let ariaLabel = $derived.by(() => {
		const active = actorConfig.filter((item) => actors[item.key]).map((item) => item.label);
		const inactive = actorConfig.filter((item) => !actors[item.key]).map((item) => item.label);
		const base = `Flow participants - active: ${active.join(', ')}`;
		return inactive.length > 0 ? `${base}; not yet involved: ${inactive.join(', ')}.` : `${base}.`;
	});
</script>

<!--
  Column-header row showing which actors/components are active in the current step.
  One chip is centered per equal-width column; FlowTrack rungs below anchor each
  HTTP message to these columns. No column gap: FlowTrack computes endpoint
  positions as (index + 0.5) / N of full width, which only holds when the
  columns divide the row exactly evenly.
-->
<div
	class="mb-4 grid items-center"
	style:grid-template-columns="repeat({actorConfig.length}, minmax(0, 1fr))"
	role="img"
	aria-label={ariaLabel}
>
	{#each actorConfig as item}
		{@const isActive = actors[item.key]}
		{@const colorInfo = getActorColorInfo(item.activeColor)}
		<!-- Active chips use the darker -700 shade so white 12px text clears the
		     WCAG AA 4.5:1 contrast ratio (the base actor colors don't); inactive
		     chips use text-ink-tertiary for the same reason. -->
		{@const activeBg = item.activeColor.startsWith('bg-actor-')
			? `${item.activeColor}-700`
			: item.activeColor}
		<div
			class="flex max-w-full items-center gap-1.5 justify-self-center rounded px-3 py-1 text-xs font-medium transition-all {isActive
				? activeBg + ` border-2 border-white/40 text-white shadow-md ${colorInfo.shadowClass}`
				: 'border-2 border-dashed border-edge-emphasis bg-surface-raised/50 text-ink-tertiary'}"
		>
			{#if isActive}
				<svg class="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<circle cx="12" cy="12" r="8" />
				</svg>
			{:else}
				<svg
					class="h-3 w-3 flex-shrink-0"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="8" />
				</svg>
			{/if}
			<span class="truncate">{item.label}</span>
		</div>
	{/each}
</div>
