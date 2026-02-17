<script lang="ts">
	import type { Step, ActorConfig, HttpMessage } from '../types.js';
	import { getActorColorInfo, generateStepText } from './transcript-utils.js';
	import HttpTranscriptEntry from './HttpTranscriptEntry.svelte';

	interface StepArticleProps {
		step: Step;
		index: number;
		totalSteps: number;
		nextStepId?: number;
		actorConfig: ActorConfig[];
	}

	let { step, index, totalSteps, nextStepId, actorConfig }: StepArticleProps = $props();

	let highlightedActor = $state<string | null>(null);
	let copied = $state(false);

	// Build a map from actor labels to keys for matching HTTP from/to fields
	let labelToKeyMap = $derived.by(() => {
		const map: Record<string, string> = {};
		actorConfig.forEach((actor) => {
			map[actor.label.toLowerCase()] = actor.key;
			map[actor.key.toLowerCase()] = actor.key;
		});
		return map;
	});

	// Sorted labels by length descending for partial matching
	let sortedLabels = $derived(
		Object.entries(labelToKeyMap).sort((a, b) => b[0].length - a[0].length)
	);

	// Get actor key from a from/to string
	function getActorKeyFromString(str: string): string | null {
		const normalized = str.toLowerCase().trim();
		// Try direct match first
		if (labelToKeyMap[normalized]) return labelToKeyMap[normalized];
		// Try partial match with longest labels first (e.g., "Caddy (oauth2-proxy)" should match "caddy")
		for (const [label, key] of sortedLabels) {
			if (normalized.includes(label)) {
				return key;
			}
		}
		return null;
	}

	// Check if an HTTP entry is FROM the highlighted actor (not just involves)
	function isHttpEntryHighlighted(entry: HttpMessage): boolean {
		if (!highlightedActor) return false;
		const fromKey = entry.from ? getActorKeyFromString(entry.from) : null;
		// Only highlight if this actor is the SENDER (from), not receiver
		return fromKey === highlightedActor;
	}

	// Get the color info for the currently highlighted actor
	let highlightedActorColor = $derived.by(() => {
		if (!highlightedActor) return null;
		const actor = actorConfig.find((a) => a.key === highlightedActor);
		return actor ? getActorColorInfo(actor.activeColor) : null;
	});

	// Get actors involved in an HTTP entry
	function getActorsInEntry(entry: HttpMessage): string[] {
		const actors: string[] = [];
		if (entry.from) {
			const key = getActorKeyFromString(entry.from);
			if (key) actors.push(key);
		}
		if (entry.to) {
			const key = getActorKeyFromString(entry.to);
			if (key && !actors.includes(key)) actors.push(key);
		}
		return actors;
	}

	// Active actors for this step
	let activeActorEntries = $derived(
		Object.entries(step.actors).filter(([_, active]) => active)
	);

	async function handleCopyStep() {
		const text = generateStepText(step);
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch (err) {
			console.error('Failed to copy step:', err);
		}
	}

	function handleHoverActors(actors: string[]) {
		if (actors.length > 0) {
			highlightedActor = actors[0];
		} else {
			highlightedActor = null;
		}
	}
</script>

<article
	id="step-{step.id}"
	aria-labelledby="step-{step.id}-title"
	class="scroll-mt-4 border-l-4 border-blue-500 bg-surface/50 p-6 print:break-inside-avoid print:border-blue-600 print:bg-white print:shadow-sm"
>
	<!-- Step header -->
	<header class="mb-4">
		<div class="mb-2 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<span
					class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-base font-bold shadow-lg shadow-blue-500/25 print:bg-blue-600"
				>
					{step.id}
				</span>
				<h2
					id="step-{step.id}-title"
					class="text-xl font-bold text-ink print:text-black"
				>
					{step.title}
				</h2>
			</div>
			<button
				onclick={handleCopyStep}
				class="rounded-md border border-edge bg-transparent px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:border-edge-emphasis hover:bg-surface-raised hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink-tertiary focus:ring-offset-2 focus:ring-offset-surface print:hidden"
				aria-label="Copy step {step.id} to clipboard"
			>
				{copied ? '\u2713 Copied' : 'Copy Step'}
			</button>
		</div>
		<p class="mt-2 text-sm leading-relaxed text-ink-secondary print:text-gray-800">
			{step.description}
		</p>
	</header>

	<!-- What the user sees -->
	<section class="mb-4">
		<h3
			class="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted print:text-gray-700"
		>
			Location
		</h3>
		<div class="rounded-md bg-canvas p-3 print:bg-gray-100">
			<p class="mb-1 text-xs text-ink-muted print:text-gray-600">Browser URL:</p>
			<code class="block break-all font-mono text-sm text-blue-300 print:text-blue-800">
				{step.urlBar}
			</code>
			<p class="mt-2 text-xs text-ink-tertiary print:text-gray-700">
				Screen: <span class="font-mono">{step.userSees}</span>
			</p>
		</div>
	</section>

	<!-- Active actors -->
	<section class="mb-4">
		<h3
			class="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted print:text-gray-700"
		>
			Active Components
			<span class="ml-2 text-xs font-normal normal-case text-ink-muted print:hidden">
				(hover to highlight requests)
			</span>
		</h3>
		<div class="flex flex-wrap gap-2">
			{#each activeActorEntries as [actorKey]}
				{@const actor = actorConfig.find((a) => a.key === actorKey)}
				{@const colorInfo = getActorColorInfo(actor?.activeColor)}
				{@const isHighlighted = highlightedActor === actorKey}
				<button
					onmouseenter={() => (highlightedActor = actorKey)}
					onmouseleave={() => (highlightedActor = null)}
					onfocus={() => (highlightedActor = actorKey)}
					onblur={() => (highlightedActor = null)}
					class="cursor-pointer rounded-full border-2 px-3 py-1 text-xs font-semibold transition-all print:border print:bg-gray-100 {isHighlighted
						? `${colorInfo.bgClass} ${colorInfo.borderClass} ${colorInfo.textClass} scale-105 shadow-lg ${colorInfo.shadowClass}`
						: `${colorInfo.bgMutedClass} ${colorInfo.borderClass} ${colorInfo.textClass} hover:scale-105`}"
					aria-pressed={isHighlighted}
					aria-label="{actor?.label || actorKey} - click to highlight related requests"
				>
					<span
						class="mr-1.5 inline-block h-2 w-2 rounded-full {colorInfo.dotClass}"
						aria-hidden="true"
					></span>
					{actor?.label || actorKey}
				</button>
			{/each}
		</div>
	</section>

	<!-- HTTP exchanges -->
	<section class="mb-4">
		<h3
			class="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted print:text-gray-700"
		>
			HTTP Exchanges
		</h3>
		<div class="space-y-3">
			{#each step.http as entry, i}
				<HttpTranscriptEntry
					{entry}
					index={i}
					isHighlighted={isHttpEntryHighlighted(entry)}
					highlightColor={highlightedActorColor}
					involvedActors={getActorsInEntry(entry)}
					onHoverActors={handleHoverActors}
					{actorConfig}
				/>
			{/each}
		</div>
	</section>

	<!-- Security note -->
	{#if step.securityNote}
		<section
			class="rounded-md border border-amber-500/30 bg-amber-900/20 p-4 print:border-amber-600 print:bg-amber-50"
		>
			<h3
				class="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-400 print:text-amber-900"
			>
				<svg
					class="h-4 w-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
					/>
				</svg>
				Security Note
			</h3>
			<p class="text-xs leading-relaxed text-ink-secondary print:text-gray-800">
				{step.securityNote}
			</p>
		</section>
	{/if}

	<!-- Skip link to next step -->
	{#if index < totalSteps - 1 && nextStepId}
		<a
			href="#step-{nextStepId}"
			class="mt-4 inline-block text-xs text-accent hover:underline print:hidden"
		>
			Skip to next step &rarr;
		</a>
	{/if}
</article>
