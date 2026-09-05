<script lang="ts">
	import type { DemoFidelity } from '../types.js';

	interface FidelityNoteProps {
		/** Per-demo fidelity metadata; absent means the default reconstructed statement */
		fidelity?: DemoFidelity;
		/** Extra classes for the wrapper (e.g. print colors, alignment) */
		class?: string;
	}

	let { fidelity, class: className = '' }: FidelityNoteProps = $props();

	const DEFAULT_STATEMENT =
		'The traces are reconstructed educational examples, not packet captures or implementation recipes. They were reviewed against published specifications and vendor documentation, not live interoperability-tested. Endpoints, cookie names, headers, and response bodies vary by vendor configuration and product version.';

	let statement = $derived(
		fidelity?.level === 'live-verified'
			? 'The traces are verified against a live integration. Endpoints, cookie names, headers, and response bodies still vary by vendor configuration and product version.'
			: DEFAULT_STATEMENT,
	);
</script>

<p class="text-xs leading-relaxed text-ink-muted {className}">
	{statement}
	{#if fidelity?.note}<span> {fidelity.note}</span>{/if}
	{#if fidelity?.reviewed}<span class="font-mono"> Documentation reviewed {fidelity.reviewed}.</span>{/if}
</p>
