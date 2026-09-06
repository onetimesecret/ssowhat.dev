<script lang="ts">
	// src/lib/sso-demos/shared/ActorDiagram.svelte

	import type { Actors, ActorConfig, ProtocolStackConnection } from '../types.js';
	import { getActorColorInfo } from './transcript-utils.js';

	interface Props {
		/** Current active state of each actor */
		actors: Actors;
		/** Configuration for actors to display */
		actorConfig: ActorConfig[];
		/**
		 * Protocol connections (from config.protocolStack). Each one that joins
		 * two adjacent actor columns is drawn as a labeled connector between
		 * their chips, so this row doubles as the protocol stack: who is in the
		 * flow, and over which protocol they talk.
		 */
		connections?: ProtocolStackConnection[];
	}

	let { actors, actorConfig, connections = [] }: Props = $props();

	/** Connector between adjacent columns i and i+1 (null when unconfigured). */
	interface Link {
		index: number;
		connection: ProtocolStackConnection | null;
		active: boolean;
	}

	let links = $derived.by((): Link[] => {
		const out: Link[] = [];
		for (let i = 0; i < actorConfig.length - 1; i++) {
			const a = actorConfig[i].key;
			const b = actorConfig[i + 1].key;
			const connection =
				connections.find(
					(c) => (c.from === a && c.to === b) || (c.from === b && c.to === a),
				) ?? null;
			out.push({ index: i, connection, active: Boolean(actors[a] || actors[b]) });
		}
		return out;
	});

	let hasLabels = $derived(links.some((l) => l.connection !== null));

	let ariaLabel = $derived.by(() => {
		const active = actorConfig.filter((item) => actors[item.key]).map((item) => item.label);
		const inactive = actorConfig.filter((item) => !actors[item.key]).map((item) => item.label);
		const base = `Flow participants - active: ${active.join(', ')}`;
		const participants =
			inactive.length > 0 ? `${base}; not yet involved: ${inactive.join(', ')}.` : `${base}.`;
		const protocols = links
			.filter((l) => l.connection)
			.map((l) => {
				const c = l.connection!;
				const label = c.subProtocol ? `${c.protocol} ${c.subProtocol}` : c.protocol;
				return `${actorConfig[l.index].label} and ${actorConfig[l.index + 1].label} over ${label}`;
			});
		return protocols.length > 0 ? `${participants} Protocols: ${protocols.join('; ')}.` : participants;
	});

	const columnWidth = $derived(100 / actorConfig.length);
</script>

<!--
  Column-header row showing which actors/components are active in the current
  step, sitting on a connector line that carries the protocol label for each
  configured link. One chip is centered per equal-width column; FlowTrack rungs
  below anchor each HTTP message to these columns. No column gap: FlowTrack
  computes endpoint positions as (index + 0.5) / N of full width, which only
  holds when the columns divide the row exactly evenly.
-->
<div class="mb-4" role="img" aria-label={ariaLabel}>
	<div class="relative">
		<!-- Connector segments, behind the chips (bare bg-actor-* classes are safelisted) -->
		<div class="absolute inset-0" aria-hidden="true">
			{#each links as link (link.index)}
				<div
					class="absolute top-1/2 -translate-y-1/2 {link.connection
						? link.active
							? `h-0.5 ${link.connection.activeColor}`
							: 'h-0 border-t-2 border-dashed border-edge-emphasis'
						: 'h-0.5 bg-edge-emphasis'}"
					style:left="{(link.index + 0.5) * columnWidth}%"
					style:width="{columnWidth}%"
				></div>
			{/each}
		</div>
		<div
			class="relative grid items-center"
			style:grid-template-columns="repeat({actorConfig.length}, minmax(0, 1fr))"
		>
			{#each actorConfig as item}
				{@const isActive = actors[item.key]}
				{@const colorInfo = getActorColorInfo(item.activeColor)}
				<!-- Active chips use the darker -700 shade so white 12px text clears the
				     WCAG AA 4.5:1 contrast ratio (the base actor colors don't); inactive
				     chips use text-ink-tertiary for the same reason. Both backgrounds are
				     opaque so the connector line stays behind the chip. -->
				{@const activeBg = item.activeColor.startsWith('bg-actor-')
					? `${item.activeColor}-700`
					: item.activeColor}
				<div
					class="flex max-w-full items-center gap-1.5 justify-self-center rounded px-3 py-1 text-xs font-medium transition-all {isActive
						? activeBg + ` border-2 border-white/40 text-white shadow-md ${colorInfo.shadowClass}`
						: 'border-2 border-dashed border-edge-emphasis bg-surface-raised text-ink-tertiary'}"
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
	</div>
	{#if hasLabels}
		<!-- Protocol labels, centered under each configured link -->
		<div class="relative mt-0.5 h-3.5" aria-hidden="true">
			{#each links as link (link.index)}
				{#if link.connection}
					<span
						class="absolute -translate-x-1/2 whitespace-nowrap text-[10px] leading-[14px] text-ink-muted"
						style:left="{(link.index + 1) * columnWidth}%"
					>
						{link.connection.protocol}
						{#if link.connection.subProtocol}
							<span class={link.active ? 'text-ink-tertiary' : 'text-ink-muted'}>{link.connection.subProtocol}</span>
						{/if}
					</span>
				{/if}
			{/each}
		</div>
	{/if}
</div>
