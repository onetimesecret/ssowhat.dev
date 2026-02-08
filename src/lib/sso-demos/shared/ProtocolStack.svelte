<script lang="ts">
	import type { Actors, ProtocolStackConfig, ProtocolStackConnection } from '../types.js';

	interface ProtocolStackProps {
		/** Current active state of each component */
		actors: Actors;
		/** Stack configuration with components and connections */
		config: ProtocolStackConfig;
	}

	let { actors, config }: ProtocolStackProps = $props();

	let components = $derived(config.components);
	let connections = $derived(config.connections);

	// Build a map for quick lookup of connection info
	let connectionMap = $derived.by(() => {
		const map = new Map<string, ProtocolStackConnection>();
		connections.forEach((conn) => {
			map.set(`${conn.from}-${conn.to}`, conn);
		});
		return map;
	});

	/**
	 * Derive border classes for connector arrows.
	 * Uses explicit border props if provided, otherwise derives from activeColor.
	 */
	function getConnectorColors(connection: ProtocolStackConnection, isActive: boolean) {
		const activeColor = isActive ? connection.activeColor : 'bg-gray-600';
		const activeBorderLeft = isActive
			? (connection.activeBorderLeft ?? connection.activeColor.replace('bg-', 'border-l-'))
			: 'border-l-gray-600';
		const activeBorderRight = isActive
			? (connection.activeBorderRight ?? connection.activeColor.replace('bg-', 'border-r-'))
			: 'border-r-gray-600';

		return { activeColor, activeBorderLeft, activeBorderRight };
	}
</script>

<!--
	Protocol stack visualization showing the authentication architecture.
	Components light up when active, with protocol labels on connections.
-->
<div class="rounded-lg border border-gray-700/50 bg-gray-800 p-5">
	<h3 class="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
		Protocol Stack
	</h3>
	<div class="flex items-center justify-center gap-4">
		{#each components as component, i}
			{@const isActive = actors[component.key]}
			{@const nextComponent = components[i + 1]}
			{@const connection = nextComponent ? connectionMap.get(`${component.key}-${nextComponent.key}`) ?? null : null}

			<!-- Component box -->
			<div
				class="flex min-w-[90px] flex-col items-center rounded-xl p-4 transition-all duration-300 motion-reduce:transition-none {isActive
					? `${component.activeGradient} ${component.activeShadow} ${component.activeRing} border-2 border-white/30`
					: 'border-2 border-dashed border-gray-500 bg-gray-700/80'}"
			>
				<div class="mb-1.5 text-2xl">{component.emoji}</div>
				<div class="text-sm font-bold">{component.label}</div>
				<div class="text-[10px] text-gray-200/80">
					{component.subLabel}
				</div>
			</div>

			<!-- Connector to next component -->
			{#if connection}
				{@const connIsActive = isActive || actors[nextComponent.key]}
				{@const colors = getConnectorColors(connection, connIsActive)}
				<div class="flex flex-col items-center gap-1">
					<div class="flex items-center gap-1" aria-hidden="true">
						<!-- Connection status icon -->
						{#if connIsActive}
							<svg class="h-3 w-3 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
								<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						{:else}
							<svg class="h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="9" stroke-dasharray="4 2" />
							</svg>
						{/if}
						<!-- Left arrow -->
						<div
							class="h-0 w-0 border-y-4 border-r-[6px] border-y-transparent transition-colors duration-300 motion-reduce:transition-none {colors.activeBorderRight}"
						></div>
						<!-- Line - solid when active, dashed when inactive -->
						<div
							class="h-0.5 w-6 transition-all duration-300 motion-reduce:transition-none {colors.activeColor} {!connIsActive ? 'border-t-2 border-dashed border-gray-500 bg-transparent' : ''}"
						></div>
						<!-- Right arrow -->
						<div
							class="h-0 w-0 border-y-4 border-l-[6px] border-y-transparent transition-colors duration-300 motion-reduce:transition-none {colors.activeBorderLeft}"
						></div>
					</div>
					<!-- Protocol label -->
					<div class="text-center text-[10px] text-gray-500">
						{connection.protocol}
						{#if connection.subProtocol}
							<br />
							<span class="text-gray-400">{connection.subProtocol}</span>
						{/if}
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>
