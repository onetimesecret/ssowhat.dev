<script lang="ts">
	import type { Component } from 'svelte';
	import BrowserMockup from './BrowserMockup.svelte';
	import HttpEntry from './HttpEntry.svelte';
	import ActorDiagram from './ActorDiagram.svelte';
	import ProtocolStack from './ProtocolStack.svelte';
	import TranscriptView from './TranscriptView.svelte';
	import type { Step, DemoConfig } from '../types.js';

	/** Duration in ms for each step during autoplay by speed */
	const SPEED_INTERVALS = {
		slow: 5000,
		normal: 3000,
		fast: 1500,
	} as const;

	type PlaybackSpeed = keyof typeof SPEED_INTERVALS;

	/** Speed control button configuration for rendering */
	const SPEED_CONTROLS = [
		{ speed: 'slow' as const, label: 'Slow speed (5 seconds per step)', emoji: '\u{1F422}' },
		{ speed: 'normal' as const, label: 'Normal speed (3 seconds per step)', emoji: '\u25B6\uFE0F' },
		{ speed: 'fast' as const, label: 'Fast speed (1.5 seconds per step)', emoji: '\u{1F407}' },
	];

	interface SSODemoShellProps {
		/** Array of demo steps */
		steps: Step[];
		/** Map of screen keys to screen components */
		screens: Record<string, Component>;
		/** Demo configuration */
		config: DemoConfig;
	}

	let { steps, screens, config }: SSODemoShellProps = $props();

	// -- State --
	let currentStep = $state(0);
	let autoPlay = $state(false);
	let loadingProgress = $state(0);
	let viewMode = $state<'interactive' | 'transcript'>('interactive');
	let playbackSpeed = $state<PlaybackSpeed>('normal');
	let announcement = $state('');

	// -- Derived --
	let step = $derived(steps[currentStep]);
	let autoplayInterval = $derived(SPEED_INTERVALS[playbackSpeed]);
	let ScreenComponent = $derived(screens[step.userSees]);

	// -- Actions --
	function toggleViewMode() {
		viewMode = viewMode === 'interactive' ? 'transcript' : 'interactive';
	}

	function restartDemo() {
		currentStep = 0;
		autoPlay = true;
		announcement = 'Demo restarted from beginning';
	}

	function changeSpeed(speed: PlaybackSpeed) {
		playbackSpeed = speed;
		announcement = `Playback speed set to ${speed}`;
	}

	function goBack() {
		currentStep = Math.max(0, currentStep - 1);
	}

	function goForward() {
		currentStep = Math.min(steps.length - 1, currentStep + 1);
	}

	function toggleAutoPlay() {
		autoPlay = !autoPlay;
	}

	// -- Keyboard handler --
	function handleKeydown(e: KeyboardEvent) {
		// Skip keyboard shortcuts when focus is on interactive elements.
		// Without BUTTON and A, pressing Space on a focused button fires both
		// the native click AND toggleAutoPlay(), causing double-actions.
		const target = e.target as HTMLElement;
		if (
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.tagName === 'SELECT' ||
			target.tagName === 'BUTTON' ||
			target.tagName === 'A'
		) {
			return;
		}

		switch (e.key) {
			case 'ArrowLeft':
				goBack();
				break;
			case 'ArrowRight':
				goForward();
				break;
			case ' ':
				e.preventDefault();
				toggleAutoPlay();
				break;
			case 't':
			case 'T':
				e.preventDefault();
				toggleViewMode();
				break;
			case 'r':
			case 'R':
				restartDemo();
				break;
			case '1':
				changeSpeed('slow');
				break;
			case '2':
				changeSpeed('normal');
				break;
			case '3':
				changeSpeed('fast');
				break;
		}
	}

	// -- Effects --

	// Autoplay: advance to next step after interval.
	// currentStep must be read synchronously (outside setTimeout) so Svelte 5
	// tracks it as a dependency. Without this, the effect never re-runs when
	// the step advances, causing autoplay to freeze at the last step.
	$effect(() => {
		if (!autoPlay) return;
		const stepIndex = currentStep;
		const total = steps.length;
		if (stepIndex >= total - 1) {
			autoPlay = false;
			return;
		}
		const timer = setTimeout(() => {
			currentStep = stepIndex + 1;
		}, autoplayInterval);
		return () => clearTimeout(timer);
	});

	// Progress bar animation for autoplay
	$effect(() => {
		if (!autoPlay) {
			loadingProgress = 0;
			return;
		}
		// Reset to 0, then animate to 100 after brief delay for render.
		// Read currentStep and autoplayInterval so Svelte tracks them as
		// dependencies — the animation must restart when the step advances
		// or when the user changes playback speed.
		loadingProgress = 0;
		void currentStep;
		void autoplayInterval;
		const timer = setTimeout(() => {
			loadingProgress = 100;
		}, 50);
		return () => clearTimeout(timer);
	});

	// Clear announcement after timeout so step changes can be announced again
	$effect(() => {
		if (!announcement) return;
		const timer = setTimeout(() => {
			announcement = '';
		}, 3000);
		return () => clearTimeout(timer);
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<!--
	Main shell component for SSO demos.
	Handles navigation, keyboard controls, autoplay, and layout.
-->
<div class="min-h-screen bg-canvas p-4 font-sans text-ink">
	<!-- Skip link for keyboard users -->
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:rounded"
	>
		Skip to demo content
	</a>

	<div class="mx-auto max-w-6xl space-y-5">
		<!-- Header -->
		<div class="text-center">
			<h1 class="mb-2 text-3xl font-bold tracking-tight text-ink">
				{config.title}
			</h1>
			<p class="text-base text-ink-tertiary">{config.subtitle}</p>
			<p class="mt-2 text-xs text-ink-muted">
				This is a static, self-contained demo for educational purposes. It does not connect to any live systems and is not intended as a reference implementation.
			</p>
		</div>

		<!-- Controls and Progress -->
		<nav aria-label="Demo navigation" class="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-surface p-3">
			<div class="flex items-center gap-2">
				<!-- Navigation controls - only shown in interactive mode -->
				{#if viewMode === 'interactive'}
					<button
						onclick={goBack}
						disabled={currentStep === 0}
						class="rounded-md border border-edge bg-transparent px-4 py-2 text-sm font-medium text-ink-secondary transition-colors motion-reduce:transition-none hover:border-edge-emphasis hover:bg-surface-raised hover:text-ink disabled:cursor-not-allowed disabled:border-edge disabled:text-ink-muted"
					>
						&larr; Previous
					</button>
					<button
						onclick={goForward}
						disabled={currentStep === steps.length - 1}
						class="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-colors motion-reduce:transition-none hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-ink-muted disabled:shadow-none"
					>
						Next &rarr;
					</button>
					<button
						onclick={toggleAutoPlay}
						aria-pressed={autoPlay}
						aria-label={autoPlay ? 'Stop autoplay' : 'Start autoplay'}
						class="rounded-md border px-3 py-2 text-xs font-medium transition-colors motion-reduce:transition-none {autoPlay
							? 'border-red-500/50 bg-red-900/30 text-red-400 hover:bg-red-900/50'
							: 'border-edge bg-transparent text-ink-tertiary hover:border-edge-emphasis hover:text-ink-secondary'}"
					>
						{autoPlay ? '\u23F9 Stop' : '\u25B6 Auto'}
					</button>
					<span class="mx-1 text-ink-muted">|</span>

					<!-- Replay controls -->
					<button
						onclick={restartDemo}
						aria-label="Restart demo from beginning"
						class="rounded-md border border-edge bg-transparent px-3 py-2 text-xs font-medium text-ink-tertiary transition-colors motion-reduce:transition-none hover:border-edge-emphasis hover:bg-surface-raised hover:text-ink-secondary"
					>
						\u23EE Restart
					</button>
					<span class="mx-1 text-ink-muted">|</span>

					<!-- Speed controls -->
					<div class="flex items-center gap-1" role="group" aria-label="Playback speed">
						{#each SPEED_CONTROLS as { speed, label, emoji }}
							<button
								onclick={() => changeSpeed(speed)}
								aria-pressed={playbackSpeed === speed}
								aria-label={label}
								class="rounded-md border px-2 py-2 text-xs font-medium transition-colors motion-reduce:transition-none {playbackSpeed === speed
									? 'border-blue-500/50 bg-blue-900/30 text-blue-400'
									: 'border-edge bg-transparent text-ink-tertiary hover:border-edge-emphasis hover:text-ink-secondary'}"
							>
								{emoji}
							</button>
						{/each}
					</div>
					<span class="mx-1 text-ink-muted">|</span>
				{/if}
				<!-- View mode toggle - always visible -->
				<button
					onclick={toggleViewMode}
					aria-pressed={viewMode === 'transcript'}
					aria-label={viewMode === 'interactive' ? 'Switch to transcript view' : 'Switch to interactive view'}
					class="rounded-md border px-3 py-2 text-xs font-medium transition-colors motion-reduce:transition-none {viewMode === 'transcript'
						? 'border-amber-500/50 bg-amber-900/30 text-amber-400 hover:bg-amber-900/50'
						: 'border-edge bg-transparent text-ink-tertiary hover:border-edge-emphasis hover:text-ink-secondary'}"
				>
					{viewMode === 'transcript' ? '\u25C0 Interactive' : '\u{1F4C4} Transcript'}
				</button>
			</div>
			<!-- Step counter with progress - only shown in interactive mode -->
			{#if viewMode === 'interactive'}
				<div class="flex items-center gap-2 sm:gap-3">
					<div class="flex items-center gap-1 overflow-x-auto sm:gap-1.5">
						{#each steps as s, i}
							{@const isCompleted = i < currentStep}
							{@const isCurrent = i === currentStep}
							{@const isPending = i > currentStep}
							<button
								onclick={() => currentStep = i}
								aria-label="{isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Pending'} step {i + 1}: {s.title}"
								class="flex flex-shrink-0 items-center justify-center rounded-full p-0.5 transition-all motion-reduce:transition-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:p-1 {isCurrent
									? 'h-5 w-6 bg-blue-500 ring-2 ring-blue-300 ring-offset-2 ring-offset-surface sm:h-6 sm:w-8'
									: isCompleted
										? 'h-5 w-5 bg-emerald-500 sm:h-6 sm:w-6'
										: 'h-5 w-5 border-2 border-dashed border-edge-emphasis bg-surface-raised sm:h-6 sm:w-6'}"
							>
								{#if isCompleted}
									<svg class="h-2.5 w-2.5 text-white sm:h-3 sm:w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
									</svg>
								{/if}
								{#if isPending}
									<svg class="h-1.5 w-1.5 text-ink-tertiary sm:h-2 sm:w-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
										<circle cx="12" cy="12" r="3" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>
					<span class="flex-shrink-0 text-xs font-medium text-ink-secondary sm:text-sm">
						Step {currentStep + 1} of {steps.length}
					</span>
				</div>
			{/if}
		</nav>

		<!-- Live region for screen reader announcements -->
		<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
			{announcement || `Step ${currentStep + 1} of ${steps.length}: ${step.title}`}
		</div>

		<!-- Keyboard shortcuts help -->
		{#if viewMode === 'interactive'}
			<div class="rounded-lg border border-edge bg-surface p-3 text-xs text-ink-tertiary">
				<div class="font-semibold text-ink-secondary mb-2 sm:mb-0 sm:inline">Keyboard: </div>
				<div class="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:inline-flex sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
					<span><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono">&larr;</kbd><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono ml-0.5">&rarr;</kbd> Navigate</span>
					<span><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono">Space</kbd> Autoplay</span>
					<span><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono">R</kbd> Restart</span>
					<span><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono">1</kbd><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono ml-0.5">2</kbd><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono ml-0.5">3</kbd> Speed</span>
					<span><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono">T</kbd> Transcript</span>
				</div>
			</div>
		{/if}

		<!-- Conditional: Interactive demo or Transcript view -->
		{#if viewMode === 'transcript'}
			<TranscriptView {steps} {config} />
		{:else}
			<!-- Step description -->
			<div class="grid min-h-32 grid-cols-1 items-center gap-6 rounded-lg border border-edge bg-surface px-5 py-4 lg:grid-cols-[1fr_auto]">
				<!-- Left: Step info -->
				<div class="flex items-center gap-4">
					<div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold shadow-lg shadow-blue-500/20">
						{step.id}
					</div>
					<div class="flex-1">
						<h3 class="text-lg font-semibold text-ink">
							{step.title}
						</h3>
						<p class="mt-1 text-sm leading-relaxed text-ink-tertiary">
							{step.description}
						</p>
					</div>
				</div>

				<!-- Right: Security note (if available) -->
				{#if step.securityNote}
					<div class="flex max-w-md items-start gap-3 self-center border-t border-edge pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
						<svg
							class="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500"
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
						<p class="text-xs leading-relaxed text-ink-muted">
							{step.securityNote}
						</p>
					</div>
				{/if}
			</div>

			<!-- Main content -->
			<main id="main-content" class="grid min-h-[50rem] grid-cols-1 gap-5 lg:grid-cols-2">
				<!-- Left: User view -->
				<div class="flex flex-col gap-3">
					<h2 class="flex items-center gap-2.5 text-base font-semibold">
						<svg
							class="h-5 w-5 text-accent"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
							/>
						</svg>
						What the user sees
					</h2>
					<BrowserMockup
						urlBar={step.urlBar}
						{loadingProgress}
						loadingDuration={autoplayInterval}
					>
						{#if ScreenComponent}
							<ScreenComponent />
						{/if}
					</BrowserMockup>
				</div>

				<!-- Right: Technical view -->
				<div class="flex flex-col gap-3">
					<h2 class="flex items-center gap-2.5 text-base font-semibold">
						<svg
							class="h-5 w-5 text-emerald-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
						What's happening (HTTP)
					</h2>
					<div class="flex flex-1 flex-col rounded-lg border border-edge bg-surface p-4">
						<ActorDiagram
							actors={step.actors}
							actorConfig={config.actorConfig}
						/>
						<div class="mb-4 flex-1 space-y-3 overflow-y-auto">
							{#each step.http as entry}
								<HttpEntry {entry} />
							{/each}
						</div>
						<!-- Legend - colors from sso-demo-theme.css -->
						<div class="mt-auto border-t border-edge pt-4">
							<h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
								Legend
							</h3>
							<div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
								<div class="flex items-center gap-2">
									<div class="h-3 w-3 rounded-sm border-l-4 border-http-request bg-http-request-dim"></div>
									<span class="text-ink-tertiary">Browser request</span>
								</div>
								<div class="flex items-center gap-2">
									<div class="h-3 w-3 rounded-sm border-l-4 border-http-response bg-http-response-dim"></div>
									<span class="text-ink-tertiary">Server response</span>
								</div>
								<div class="flex items-center gap-2">
									<div class="h-3 w-3 rounded-sm border-l-4 border-http-server bg-http-server-dim"></div>
									<span class="text-ink-tertiary">Server-to-server</span>
								</div>
								<div class="flex items-center gap-2">
									<div class="h-3 w-3 rounded-sm border-l-4 border-http-internal bg-surface-raised/50"></div>
									<span class="text-ink-tertiary">Internal process</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</main>

			<!-- Protocol Stack -->
			<ProtocolStack actors={step.actors} config={config.protocolStack} />

			<!-- Footer -->
			<div class="flex items-center justify-between pt-4 text-xs text-ink-muted">
				<a
					href={config.backLink.href}
					class="flex items-center gap-1 text-ink-muted transition-colors hover:text-ink-secondary"
				>
					&larr; {config.backLink.label}
				</a>
				<div class="flex items-center gap-2">
					<span>An Authentication Flow Demo</span>
					<span class="rounded bg-surface px-1.5 py-0.5 font-mono text-ink-muted">
						v{config.version}
					</span>
				</div>
			</div>
		{/if}
	</div>
</div>
