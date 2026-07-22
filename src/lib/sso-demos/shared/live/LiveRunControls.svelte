<!-- src/lib/sso-demos/shared/live/LiveRunControls.svelte -->
<script lang="ts">
	import type { Step } from '../../types.js';
	import type { LiveSession } from './session.svelte.js';

	/**
	 * Run/Compare controls for the current step, rendered in the HTTP-panel
	 * header row while transport is live. Steps without a live spec get the
	 * quiet static-only pill. Offline replaces Run with Retry connection.
	 * Failed runs show an inline amber banner with Try again.
	 */

	interface Props {
		/** The current step */
		step: Step;
		/** All demo steps, used to describe auto-run prerequisites */
		steps: Step[];
		/** Live session state (results, backend status, running flag) */
		session: LiveSession;
		/** Runs the current step's live exchanges (the shell owns announcements) */
		onrun: () => void;
		/** Re-probes the backend after an offline state */
		onretry: () => void;
		/** Opens the static-versus-live compare panel */
		onopencompare: () => void;
		/** Element id for the Compare button, so the shell can restore focus when the panel closes */
		compareButtonId: string;
	}

	let { step, steps, session, onrun, onretry, onopencompare, compareButtonId }: Props = $props();

	let result = $derived(session.results[step.id]);
	let busy = $derived(session.runningStepId !== null);
	let busyThis = $derived(session.runningStepId === step.id);
	let showError = $derived(session.lastError !== null && session.lastErrorStepId === step.id && !busy);

	let prerequisiteNotice = $derived.by(() => {
		if (!result || result.ranPrerequisiteStepIds.length === 0) return null;
		const parts = result.ranPrerequisiteStepIds.map((id) => {
			const prerequisite = steps.find((candidate) => candidate.id === id);
			const exchange = prerequisite?.live?.exchanges[0];
			if (!exchange) return `step ${id}`;
			return `${exchange.method} ${exchange.path.replace(/^\/scim\/v2/, '')} (step ${id})`;
		});
		return `Prerequisite ran: ${parts.join(', ')} created Alice in this session.`;
	});
</script>

<div class="flex flex-col items-end gap-1.5 print:hidden">
	{#if !step.live}
		<span class="text-xs text-ink-muted">static only &mdash; no SCIM traffic in this step</span>
	{:else}
		<div class="flex flex-wrap items-center justify-end gap-2">
			{#if session.backend === 'offline'}
				<button
					onclick={onretry}
					class="rounded-md border border-amber-500/50 bg-amber-900/30 px-2.5 py-1 text-xs font-medium text-amber-400 transition-colors motion-reduce:transition-none hover:bg-amber-900/50 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
				>
					Retry connection
				</button>
			{:else}
				<!-- aria-disabled + click guard rather than the disabled attribute:
				     disabling the focused button mid-run would throw keyboard focus
				     to <body> on every single live run (WCAG 2.4.3). -->
				<button
					onclick={() => {
						if (!busy) onrun();
					}}
					aria-disabled={busy}
					aria-busy={busyThis}
					class="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas {busy
						? 'cursor-not-allowed bg-surface-raised text-ink-muted'
						: 'bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-500'}"
				>
					{#if busyThis}
						<svg class="h-3 w-3 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25" />
							<path fill="currentColor" class="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
						</svg>
						Running&hellip;
					{:else if result}
						&#x21BB; Run again
					{:else}
						&#x25B6; Run live
					{/if}
				</button>
			{/if}
			{#if result}
				<button
					id={compareButtonId}
					onclick={onopencompare}
					class="rounded-md border border-emerald-500/50 bg-emerald-900/30 px-2.5 py-1 text-xs font-medium text-emerald-400 transition-colors motion-reduce:transition-none hover:bg-emerald-900/50 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
				>
					&#x21C4; Compare
				</button>
			{/if}
		</div>
		{#if prerequisiteNotice}
			<p class="text-xs text-ink-tertiary italic">{prerequisiteNotice}</p>
		{/if}
		{#if showError}
			<div
				role="note"
				class="flex flex-wrap items-center justify-end gap-2 rounded border border-amber-500/30 bg-amber-900/20 px-3 py-2 text-xs text-amber-200"
			>
				<span>Live run failed: {session.lastError}</span>
				<button
					onclick={onrun}
					class="rounded border border-amber-500/40 px-2 py-0.5 font-medium text-amber-200 transition-colors motion-reduce:transition-none hover:bg-amber-900/40 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
				>
					Try again
				</button>
			</div>
		{/if}
	{/if}
</div>
