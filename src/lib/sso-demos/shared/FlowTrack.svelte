<script lang="ts">
	// src/lib/sso-demos/shared/FlowTrack.svelte

	import type { HttpMessage, ActorConfig } from '../types.js';
	import { resolveActorIndex, getHttpMessageTypeConfig } from './transcript-utils.js';

	interface Props {
		/** Source actor name from the HTTP entry */
		from: string;
		/** Destination actor name from the HTTP entry */
		to: string;
		/** HTTP message type; determines the connecting line color */
		type: HttpMessage['type'];
		/** Actor configuration defining the column geometry (must match ActorDiagram) */
		actorConfig: ActorConfig[];
	}

	let { from, to, type, actorConfig }: Props = $props();

	/** Line color per message type. Static strings so the Tailwind scanner picks them up. */
	const TYPE_LINE_CLASSES: Record<HttpMessage['type'], string> = {
		request: 'bg-http-request',
		response: 'bg-http-response',
		internal: 'bg-http-internal',
		server: 'bg-http-server',
		'server-response': 'bg-http-server'
	};

	/** Horizontal center of a column, as a percentage of full track width */
	function columnCenter(index: number): number {
		return ((index + 0.5) * 100) / actorConfig.length;
	}

	let fromIndex = $derived(resolveActorIndex(from, actorConfig));
	let toIndex = $derived(resolveActorIndex(to, actorConfig));
	let fromPos = $derived(fromIndex === -1 ? 0 : columnCenter(fromIndex));
	let toPos = $derived(toIndex === -1 ? 0 : columnCenter(toIndex));
	// Full rung needs two distinct resolved endpoints; a self-referential or
	// half-resolved internal message collapses to a dot with a loop glyph.
	// Anything else (pseudo-actors like "oauth2-proxy") renders nothing.
	let showTrack = $derived(fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex);
	let showLoop = $derived(!showTrack && fromIndex !== -1 && type === 'internal');
	let pointsRight = $derived(toPos > fromPos);
	let typeBorderColor = $derived(getHttpMessageTypeConfig(type).borderColor);
</script>

<!--
	Sequence-diagram ladder rung: anchors an HTTP entry to the actor columns of
	ActorDiagram above it. Decorative only - the entry card carries the textual
	from/to for screen readers. Hidden below lg, where the flat card stack is
	the fallback.
-->
{#if showTrack}
	<div class="relative mb-1 hidden h-4 w-full lg:block" aria-hidden="true">
		<!-- Connecting line, colored by message type -->
		<div
			class="absolute top-1/2 h-0.5 -translate-y-1/2 {TYPE_LINE_CLASSES[type]}"
			style:left="{Math.min(fromPos, toPos)}%"
			style:width="{Math.abs(toPos - fromPos)}%"
		></div>
		<!-- Arrowhead (CSS triangle) at the destination end; tip meets the dot edge -->
		<div
			class="absolute top-1/2 h-0 w-0 -translate-y-1/2 border-y-4 border-y-transparent"
			style:left={pointsRight ? `calc(${toPos}% - 10px)` : `calc(${toPos}% + 4px)`}
			style:border-left={pointsRight ? `6px solid ${typeBorderColor}` : undefined}
			style:border-right={pointsRight ? undefined : `6px solid ${typeBorderColor}`}
		></div>
		<!-- Endpoint dots, colored by actor (bare bg-actor-* classes are safelisted) -->
		<div
			class="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full {actorConfig[fromIndex].activeColor}"
			style:left="{fromPos}%"
		></div>
		<div
			class="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full {actorConfig[toIndex].activeColor}"
			style:left="{toPos}%"
		></div>
	</div>
{:else if showLoop}
	<div class="relative mb-1 hidden h-4 w-full lg:block" aria-hidden="true">
		<div
			class="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full {actorConfig[fromIndex].activeColor}"
			style:left="{fromPos}%"
		></div>
		<span
			class="absolute top-1/2 -translate-y-1/2 text-[10px] leading-none text-http-internal"
			style:left="calc({fromPos}% + 6px)">&#x21bb;</span
		>
	</div>
{/if}
