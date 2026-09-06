<script lang="ts">
	import type { HttpMessage, ActorConfig } from '../types.js';
	import { resolveActorBg } from './transcript-utils.js';

	/**
	 * Renders a single HTTP message in the authentication flow.
	 * Supports requests, responses, internal processes, and server-to-server communication.
	 * Includes expandable payload sections for decoded SAML/JWT content.
	 */

	const TYPE_STYLES: Record<HttpMessage['type'], string> = {
		request: 'border-l-4 border-http-request bg-http-request-dim',
		response: 'border-l-4 border-http-response bg-http-response-dim',
		internal: 'border-l-4 border-http-internal bg-white/[0.03]',
		server: 'border-l-4 border-http-server bg-http-server-dim',
		'server-response': 'border-l-4 border-http-server bg-http-server-dim',
	};

	// Message-type color lives on the left rule and the type label only; the
	// card wash stays at 10% so the method/URL line reads first.
	const TYPE_LABEL_COLORS: Record<HttpMessage['type'], string> = {
		request: 'text-blue-300',
		response: 'text-emerald-300',
		internal: 'text-ink-tertiary',
		server: 'text-purple-300',
		'server-response': 'text-purple-300',
	};

	const TYPE_LABELS: Record<HttpMessage['type'], string> = {
		request: 'REQUEST',
		response: 'RESPONSE',
		internal: 'INTERNAL',
		server: 'SERVER\u2192SERVER',
		'server-response': 'SERVER RESPONSE',
	};

	interface Props {
		/** The HTTP message to display */
		entry: HttpMessage;
		/** Actor configuration used to color from/to names (optional) */
		actorConfig?: ActorConfig[];
	}

	let { entry, actorConfig = [] }: Props = $props();

	// Method/status text color: emerald-400 fails WCAG AA (4.23:1) on the
	// emerald-tinted bg-http-response-dim background, so response entries use
	// the lighter emerald-300. It passes on request/server dim backgrounds.
	let methodStatusColor = $derived(entry.type === 'response' ? 'text-emerald-300' : 'text-emerald-400');

	let expanded = $state(false);

	// Stable per-instance ID for aria-controls (consistent between prerender and hydration)
	const uid = $props.id();
</script>

<div class="{TYPE_STYLES[entry.type]} rounded p-3 text-sm">
	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0 flex-1">
			<div class="mb-1 flex items-center gap-2 text-xs text-ink-tertiary">
				<span class="flex items-center gap-2 {TYPE_LABEL_COLORS[entry.type]}">
				<!-- Type icon -->
				{#if entry.type === 'request'}
					<svg
						class="h-4 w-4 flex-shrink-0"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
					</svg>
				{:else if entry.type === 'response'}
					<svg
						class="h-4 w-4 flex-shrink-0"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
					</svg>
				{:else if entry.type === 'internal'}
					<svg
						class="h-4 w-4 flex-shrink-0"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
				{:else if entry.type === 'server'}
					<svg
						class="h-4 w-4 flex-shrink-0"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
					</svg>
				{:else if entry.type === 'server-response'}
					<svg
						class="h-4 w-4 flex-shrink-0"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M16 17l-4 4m0 0l-4-4m4 4V3" />
					</svg>
				{/if}

				<span class="font-mono font-semibold">{TYPE_LABELS[entry.type]}</span>
				</span>

				{#if entry.from && entry.to}
					{@const fromBg = resolveActorBg(entry.from, actorConfig)}
					{@const toBg = resolveActorBg(entry.to, actorConfig)}
					<span>
						{#if fromBg}
							<span class="inline-flex items-center gap-1">
								<span class="inline-block h-2 w-2 rounded-full {fromBg}" aria-hidden="true"></span>{entry.from}
							</span>
						{:else}
							{entry.from}
						{/if}
						&rarr;
						{#if toBg}
							<span class="inline-flex items-center gap-1">
								<span class="inline-block h-2 w-2 rounded-full {toBg}" aria-hidden="true"></span>{entry.to}
							</span>
						{:else}
							{entry.to}
						{/if}
					</span>
				{/if}
			</div>

			{#if entry.label}
				<div class="mb-1 font-medium text-amber-300">
					{entry.label}
				</div>
			{/if}

			{#if entry.method}
				<div class="font-mono">
					<span class={methodStatusColor}>{entry.method}</span>{' '}
					<span class="break-all text-blue-300">{entry.url}</span>
				</div>
			{/if}

			{#if entry.status}
				<div class="font-mono {methodStatusColor}">{entry.status}</div>
			{/if}

			{#if entry.headers && entry.headers.length > 0}
				<div class="mt-2 font-mono text-xs text-ink-tertiary">
					{#each entry.headers as header}
						<div>{header}</div>
					{/each}
				</div>
			{/if}

			{#if entry.body}
				<pre
					class="mt-2 overflow-x-auto rounded bg-code-surface p-2 font-mono text-xs whitespace-pre-wrap text-ink-secondary">{entry.body}</pre>
			{/if}

			{#if entry.note}
				<div class="mt-2 flex items-start gap-1.5 text-xs text-amber-300/90 italic">
					<svg class="mt-0.5 h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" />
					</svg>
					<span>{entry.note}</span>
				</div>
			{/if}
		</div>

		{#if entry.expandedPayload}
			<button
				onclick={() => (expanded = !expanded)}
				aria-expanded={expanded}
				aria-controls="payload-{uid}"
				class="flex-shrink-0 rounded bg-surface-raised px-2 py-1 text-xs hover:bg-surface-raised/80"
			>
				{expanded ? 'Hide decoded' : 'Show decoded'}
			</button>
		{/if}
	</div>

	{#if expanded && entry.expandedPayload}
		<div id="payload-{uid}" class="mt-3 border-t border-edge pt-3">
			<div class="mb-1 text-xs text-ink-tertiary">
				{entry.expandedPayload.label}
			</div>
			<pre class="overflow-x-auto rounded bg-code-surface-deep p-3 font-mono text-xs whitespace-pre-wrap text-green-300">{entry
					.expandedPayload.content}</pre>
		</div>
	{/if}
</div>
