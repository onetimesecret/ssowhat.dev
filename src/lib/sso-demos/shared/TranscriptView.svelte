<script lang="ts">
	import type { Step, DemoConfig } from '../types.js';
	import { generatePlainTextTranscript } from './transcript-utils.js';
	import StepArticle from './StepArticle.svelte';

	interface TranscriptViewProps {
		/** Array of demo steps to render as transcript */
		steps: Step[];
		/** Demo configuration */
		config: DemoConfig;
	}

	let { steps, config }: TranscriptViewProps = $props();

	let copiedAll = $state(false);

	/**
	 * Copies entire transcript as plain text to clipboard
	 */
	async function handleCopyAll() {
		const transcript = generatePlainTextTranscript(steps, config);
		try {
			await navigator.clipboard.writeText(transcript);
			copiedAll = true;
			setTimeout(() => (copiedAll = false), 2000);
		} catch (err) {
			console.error('Failed to copy transcript:', err);
		}
	}
</script>

<!--
	TranscriptView renders the entire SSO flow as a readable document.
	Designed for reading/text-oriented learners who prefer a full transcript
	over interactive demos. Print-friendly, accessible, and exportable.
-->
<div class="min-h-screen bg-gray-900 font-sans text-gray-100 print:bg-white print:text-black">
	<!-- Skip link for keyboard users -->
	<a
		href="#transcript-content"
		class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
	>
		Skip to transcript content
	</a>

	<div class="mx-auto max-w-5xl p-6 print:p-0">
		<!-- Header -->
		<header class="mb-8 border-b border-gray-700 pb-6 print:border-black">
			<div class="mb-4 flex items-start justify-between print:block">
				<div class="flex-1">
					<h1
						class="mb-2 text-3xl font-bold tracking-tight text-blue-200 print:text-black"
					>
						{config.title}
					</h1>
					<p class="text-base text-gray-400 print:text-gray-800">
						{config.subtitle}
					</p>
				</div>
				<div class="flex gap-2 print:hidden">
					<button
						onclick={handleCopyAll}
						class="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-gray-900"
						aria-label="Copy entire transcript to clipboard"
					>
						{copiedAll ? '\u2713 Copied' : 'Copy All'}
					</button>
					<button
						onclick={() => window.print()}
						class="rounded-md border border-gray-600 bg-transparent px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500 hover:bg-gray-700 hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900"
						aria-label="Print transcript"
					>
						Print
					</button>
				</div>
			</div>
			<div class="text-xs text-gray-500 print:text-gray-700">
				<span class="font-mono">v{config.version}</span>
				<span class="mx-2">&bull;</span>
				<span>{steps.length} steps</span>
				<span class="mx-2">&bull;</span>
				<span>Full transcript view</span>
			</div>
		</header>

		<!-- Main transcript content -->
		<main id="transcript-content">
			<nav
				aria-label="Table of contents"
				class="mb-8 rounded-lg border border-gray-700 bg-gray-800 p-4 print:border-gray-300 print:bg-gray-50"
			>
				<h2 class="mb-3 text-base font-semibold text-gray-100 print:text-black">
					Table of Contents
				</h2>
				<ol class="space-y-1.5 text-sm">
					{#each steps as step}
						<li>
							<a
								href="#step-{step.id}"
								class="text-blue-400 hover:text-blue-300 hover:underline print:text-blue-700"
							>
								Step {step.id}: {step.title}
							</a>
						</li>
					{/each}
				</ol>
			</nav>

			<!-- Render each step as an article -->
			<div class="space-y-8">
				{#each steps as step, index}
					<StepArticle
						{step}
						{index}
						totalSteps={steps.length}
						nextStepId={steps[index + 1]?.id}
						actorConfig={config.actorConfig}
					/>
				{/each}
			</div>
		</main>

		<!-- Footer -->
		<footer
			class="mt-12 border-t border-gray-700 pt-6 text-center text-xs text-gray-600 print:border-gray-300 print:text-gray-700"
		>
			<p>
				<a
					href={config.backLink.href}
					class="text-blue-400 hover:underline print:text-blue-700"
				>
					&larr; {config.backLink.label}
				</a>
			</p>
			<p class="mt-2">
				Generated transcript for {config.title} &bull; v{config.version}
			</p>
		</footer>
	</div>
</div>
