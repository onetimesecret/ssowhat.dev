<script lang="ts">
	import type { HttpMessage, ActorConfig } from '../types.js';
	import {
		getHttpMessageTypeConfig,
		formatHttpEntryAsText,
		type ActorColorInfo
	} from './transcript-utils.js';

	interface HttpTranscriptEntryProps {
		entry: HttpMessage;
		index: number;
		isHighlighted: boolean;
		highlightColor: ActorColorInfo | null;
		involvedActors: string[];
		onHoverActors: (actors: string[]) => void;
		actorConfig: ActorConfig[];
	}

	let {
		entry,
		index,
		isHighlighted,
		highlightColor,
		involvedActors,
		onHoverActors,
		actorConfig
	}: HttpTranscriptEntryProps = $props();

	let showPayload = $state(false);
	let copied = $state(false);

	// Stable unique ID for aria-controls
	const uniqueId = `http-entry-${crypto.randomUUID()}`;

	let typeConfig = $derived(getHttpMessageTypeConfig(entry.type));

	let highlightRingClass = $derived.by(() => {
		if (isHighlighted && highlightColor) {
			return `${highlightColor.bgClass} ring-2 ${highlightColor.ringClass}/60 ring-offset-1 ring-offset-gray-900`;
		}
		return '';
	});

	async function handleCopyEntry() {
		const text = formatHttpEntryAsText(entry);
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	function handleMouseEnter() {
		onHoverActors(involvedActors);
	}

	function handleMouseLeave() {
		onHoverActors([]);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group relative rounded-md border-l-4 p-4 transition-all print:break-inside-avoid print:bg-gray-50 {isHighlighted
		? highlightRingClass ||
			'bg-gray-800 ring-2 ring-blue-400/50 ring-offset-1 ring-offset-gray-900'
		: 'bg-gray-900/50 hover:bg-gray-800/70'}"
	style:border-left-color={typeConfig.borderColor}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
>
	<!-- Copy button - appears on hover -->
	<button
		onclick={handleCopyEntry}
		class="absolute right-2 top-2 rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 opacity-0 transition-opacity hover:bg-gray-600 group-hover:opacity-100 print:hidden"
		aria-label="Copy this HTTP entry"
	>
		{copied ? '\u2713 Copied' : 'Copy'}
	</button>

	<!-- Message header -->
	<div class="mb-2">
		<div
			class="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 print:text-gray-700"
		>
			<span
				class="rounded px-1.5 py-0.5"
				style:background-color="{typeConfig.borderColor}20"
			>
				{typeConfig.label}
			</span>
			{#if entry.from && entry.to}
				<span class="font-medium text-gray-300 print:text-gray-600">
					{entry.from} &rarr; {entry.to}
				</span>
			{/if}
		</div>
		{#if entry.label}
			<p class="mb-1 text-sm font-medium text-yellow-400 print:text-yellow-800">
				{entry.label}
			</p>
		{/if}
	</div>

	<!-- Request details -->
	{#if entry.method && entry.url}
		<div class="mb-2">
			<code class="block font-mono text-sm print:break-all">
				<span class="text-emerald-400 print:text-emerald-700">{entry.method}</span>
				{' '}
				<span class="text-blue-300 print:text-blue-700">{entry.url}</span>
			</code>
		</div>
	{/if}

	<!-- Response status -->
	{#if entry.status}
		<div class="mb-2">
			<code class="block font-mono text-sm text-emerald-400 print:text-emerald-700">
				{entry.status}
			</code>
		</div>
	{/if}

	<!-- Headers -->
	{#if entry.headers && entry.headers.length > 0}
		<div class="mb-2">
			<h4 class="mb-1 text-xs font-semibold text-gray-500 print:text-gray-700">Headers:</h4>
			<pre
				class="overflow-x-auto rounded bg-black/30 p-2 font-mono text-xs text-gray-400 print:bg-gray-100 print:text-gray-800"
				aria-label="HTTP headers">{entry.headers.join('\n')}</pre>
		</div>
	{/if}

	<!-- Body -->
	{#if entry.body}
		<div class="mb-2">
			<h4 class="mb-1 text-xs font-semibold text-gray-500 print:text-gray-700">Body:</h4>
			<pre
				class="overflow-x-auto rounded bg-black/30 p-2 font-mono text-xs text-gray-300 print:bg-gray-100 print:text-gray-800"
				aria-label="HTTP body">{entry.body}</pre>
		</div>
	{/if}

	<!-- Note -->
	{#if entry.note}
		<p class="mb-2 text-xs italic text-yellow-500/80 print:text-yellow-800">
			Note: {entry.note}
		</p>
	{/if}

	<!-- Expanded payload (SAML, JWT, etc.) -->
	{#if entry.expandedPayload}
		<div class="mt-3 border-t border-gray-700 pt-3 print:border-gray-300">
			<button
				onclick={() => (showPayload = !showPayload)}
				aria-expanded={showPayload}
				aria-controls={uniqueId}
				class="mb-2 rounded bg-gray-700 px-3 py-1 text-xs font-medium text-gray-200 hover:bg-gray-600 print:hidden"
			>
				{showPayload ? 'Hide' : 'Show'} {entry.expandedPayload.label}
			</button>
			<div id={uniqueId} class="{showPayload ? 'block' : 'hidden'} print:block">
				<h4 class="mb-1 text-xs font-semibold text-gray-400 print:text-gray-700">
					{entry.expandedPayload.label}:
				</h4>
				<pre
					class="overflow-x-auto rounded bg-black/40 p-3 font-mono text-xs text-green-300 print:bg-gray-100 print:text-gray-900"
					aria-label={entry.expandedPayload.label}>{entry.expandedPayload.content}</pre>
			</div>
		</div>
	{/if}
</div>
