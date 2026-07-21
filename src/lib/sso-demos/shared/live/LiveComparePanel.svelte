<!-- src/lib/sso-demos/shared/live/LiveComparePanel.svelte -->
<script lang="ts">
	import type { ActorConfig, HttpMessage, LiveStepResult, Step } from '../../types.js';
	import type { ExchangeDiff } from './diff.js';
	import { diffExchange } from './diff.js';
	import { getHttpMessageTypeConfig } from '../transcript-utils.js';
	import HttpEntry from '../HttpEntry.svelte';
	import DiffChips from './DiffChips.svelte';

	/**
	 * Full-width static-versus-live takeover of the main grid. One row per
	 * message index of the static http array so cells row-align; static-only
	 * indices get a dashed placeholder on the live side; replayable indices
	 * render the captured live messages through the unmodified HttpEntry.
	 * Each exchange gets a DiffChips strip spanning both columns above its
	 * request row.
	 */

	interface Props {
		/** The step being compared */
		step: Step;
		/** The cached live run result for this step */
		result: LiveStepResult;
		/** Actor configuration for HttpEntry dots */
		actorConfig: ActorConfig[];
		/** Closes the panel (also bound to Escape in the shell) */
		onclose: () => void;
	}

	let { step, result, actorConfig, onclose }: Props = $props();

	// Stable per-instance IDs for the column headers and skip target
	const uid = $props.id();

	interface CompareRow {
		index: number;
		staticMessage: HttpMessage;
		liveMessage?: HttpMessage;
		placeholder?: string;
		diff?: ExchangeDiff;
	}

	let rows = $derived.by<CompareRow[]>(() =>
		step.http.map((staticMessage, index) => {
			const asRequest = result.exchanges.find((exchange) => exchange.spec.staticRequestIndex === index);
			if (asRequest) {
				const staticResponse = step.http[asRequest.spec.staticResponseIndex];
				const row: CompareRow = { index, staticMessage, liveMessage: asRequest.request };
				if (asRequest.response && staticResponse) {
					row.diff = diffExchange(staticMessage, staticResponse, asRequest.request, asRequest.response);
				}
				return row;
			}
			const asResponse = result.exchanges.find((exchange) => exchange.spec.staticResponseIndex === index);
			if (asResponse) {
				if (asResponse.response) return { index, staticMessage, liveMessage: asResponse.response };
				return { index, staticMessage, placeholder: 'not replayed — no live response' };
			}
			return {
				index,
				staticMessage,
				placeholder:
					staticMessage.type === 'internal' ? 'not replayed — internal process' : 'not replayed — admin UI action',
			};
		})
	);

	let has409 = $derived(result.exchanges.some((exchange) => exchange.response?.status?.startsWith('409')));
</script>

<section
	aria-label="Static versus live comparison for step {step.id}"
	class="min-w-0 rounded-lg border border-edge bg-surface p-4"
>
	<a
		href="#compare-close-{uid}"
		class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
	>
		Skip to comparison controls
	</a>

	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<button
			id="compare-close-{uid}"
			onclick={onclose}
			class="rounded-md border border-edge bg-transparent px-3 py-2 text-xs font-medium text-ink-tertiary transition-colors motion-reduce:transition-none hover:border-edge-emphasis hover:bg-surface-raised hover:text-ink-secondary focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
		>
			&#x25C0; Back to step
		</button>
		<p class="text-xs text-ink-tertiary">
			Static traces are the map; live responses are the territory. Highlighted fields are the values only a real server
			can mint.
		</p>
	</div>

	{#if has409}
		<p class="mb-3 text-xs text-ink-tertiary italic">
			A response returned 409 Conflict &mdash; this resource already exists in the live session. Use New session in the
			transport bar for a fresh 201.
		</p>
	{/if}

	<div class="sticky top-0 z-10 mb-3 hidden gap-4 border-b border-edge bg-surface pb-2 lg:grid lg:grid-cols-2">
		<div id="compare-col-static-{uid}" class="text-xs font-semibold tracking-wider text-ink-secondary uppercase">
			Static (scripted)
		</div>
		<div id="compare-col-live-{uid}" class="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
			Live (this session)
		</div>
	</div>

	<ol role="list" class="list-none space-y-4 [scrollbar-gutter:stable]">
		{#each rows as row (row.index)}
			{@const typeLabel = getHttpMessageTypeConfig(row.staticMessage.type).label}
			{@const fromTo =
				row.staticMessage.from && row.staticMessage.to
					? ` ${row.staticMessage.from} to ${row.staticMessage.to}`
					: ''}
			<li
				aria-label="Message {row.index + 1}: {typeLabel}{fromTo}"
				class="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4"
			>
				{#if row.diff}
					<div class="min-w-0 lg:col-span-2">
						<DiffChips diff={row.diff} />
					</div>
				{/if}
				<div class="min-w-0" aria-labelledby="compare-col-static-{uid}">
					<div class="mb-1 text-[10px] tracking-wider text-ink-muted uppercase lg:hidden">Static</div>
					<HttpEntry entry={row.staticMessage} {actorConfig} />
				</div>
				<div class="min-w-0" aria-labelledby="compare-col-live-{uid}">
					<div class="mb-1 text-[10px] tracking-wider text-ink-muted uppercase lg:hidden">Live</div>
					{#if row.liveMessage}
						<HttpEntry entry={row.liveMessage} {actorConfig} />
					{:else}
						<div class="rounded border border-dashed border-edge p-3 text-xs text-ink-muted">{row.placeholder}</div>
					{/if}
				</div>
			</li>
		{/each}
	</ol>
</section>
