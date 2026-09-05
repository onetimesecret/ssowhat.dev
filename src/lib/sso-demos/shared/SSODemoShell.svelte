<script lang="ts">
	import type { Component } from 'svelte';
	import { tick } from 'svelte';
	import { browser } from '$app/environment';
	import BrowserMockup from './BrowserMockup.svelte';
	import HttpEntry from './HttpEntry.svelte';
	import ActorDiagram from './ActorDiagram.svelte';
	import FlowTrack from './FlowTrack.svelte';
	import ProtocolStack from './ProtocolStack.svelte';
	import TranscriptView from './TranscriptView.svelte';
	import FidelityNote from './FidelityNote.svelte';
	import TransportToggle from './live/TransportToggle.svelte';
	import LiveRunControls from './live/LiveRunControls.svelte';
	import LiveComparePanel from './live/LiveComparePanel.svelte';
	import { createLiveSession } from './live/session.svelte.js';
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
		{ speed: 'slow' as const, label: 'Slow speed (5 seconds per step)', text: 'Slow' },
		{ speed: 'normal' as const, label: 'Normal speed (3 seconds per step)', text: 'Normal' },
		{ speed: 'fast' as const, label: 'Fast speed (1.5 seconds per step)', text: 'Fast' },
	];

	/** localStorage keys for persisted UI preferences */
	const CHAR_SHORTCUTS_KEY = 'ssowhat:char-shortcuts';
	const KBD_HELP_KEY = 'ssowhat:kbd-help';
	const TRANSPORT_KEY = 'ssowhat:transport';

	// localStorage is client-only (guarded for prerendering), and the accessor
	// itself can throw SecurityError when storage is blocked (e.g. Chrome's
	// "Block all cookies", some webviews) - so all access goes through these
	// helpers instead of touching localStorage directly.
	function readPref(key: string): string | null {
		if (!browser) return null;
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	}

	function writePref(key: string, value: string) {
		if (!browser) return;
		try {
			localStorage.setItem(key, value);
		} catch {
			// Storage unavailable; the preference simply won't persist.
		}
	}

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
	// Single-character shortcut opt-out (WCAG 2.1.4) and keyboard-help visibility
	// (closed by default), both persisted across visits. Initialized to SSR-safe
	// defaults; persisted prefs are loaded client-only in an effect below to avoid
	// a hydration mismatch against the prerendered markup.
	let charShortcutsEnabled = $state(true);
	let kbdHelpOpen = $state(false);
	// Live transport (issue #8). SSR always renders static; the persisted
	// transport preference is loaded in the client-only effect below. The
	// session object is null for demos without config.live, which keeps every
	// live code path inert for them.
	let transport = $state<'static' | 'live'>('static');
	let compareOpen = $state(false);
	// Created once from the initial props: a demo's steps/config never change
	// identity at runtime, so capturing the initial value is intentional.
	// svelte-ignore state_referenced_locally
	const liveSession = createLiveSession(config.live, steps);

	// Hydration-stable id for the Compare button so closeCompare() can return
	// focus to it after the takeover unmounts.
	const uid = $props.id();
	const compareButtonId = `${uid}-compare-open`;

	// -- Derived --
	let step = $derived(steps[currentStep]);
	let autoplayInterval = $derived(SPEED_INTERVALS[playbackSpeed]);
	let ScreenComponent = $derived(screens[step.userSees]);
	let showLiveUi = $derived(transport === 'live' && liveSession !== null);
	let liveResult = $derived(liveSession ? liveSession.results[step.id] : undefined);

	// Load persisted UI prefs after mount. Effects run client-only, so reading
	// localStorage here (rather than in the $state initializers) keeps the first
	// client render identical to the prerendered HTML.
	$effect(() => {
		charShortcutsEnabled = readPref(CHAR_SHORTCUTS_KEY) !== 'false';
		kbdHelpOpen = readPref(KBD_HELP_KEY) === 'open';
		// Restoring the pref does NOT probe the backend -- probes are lazy
		// (toggle click, pill retry, run failure), never on page load.
		if (liveSession && readPref(TRANSPORT_KEY) === 'live') {
			transport = 'live';
		}
	});

	// The compare takeover is a per-step view; close it whenever the step
	// changes. The only way to change steps while it is open is pointer
	// navigation (shortcuts are modal-guarded and opening the takeover stops
	// autoplay), and there focus stays on the control the user clicked, so
	// closing without closeCompare()'s focus restoration is safe.
	$effect(() => {
		void currentStep;
		compareOpen = false;
	});

	// -- Actions --
	function toggleViewMode() {
		viewMode = viewMode === 'interactive' ? 'transcript' : 'interactive';
	}

	function restartDemo() {
		currentStep = 0;
		autoPlay = true;
		// Restart means "run the story again": while live with an existing
		// session, replaying the create into the old session would 409 on the
		// happy path, so Restart also mints a fresh live session.
		if (transport === 'live' && liveSession && liveSession.sessionId) {
			liveSession.reset();
			compareOpen = false;
			announcement = 'Demo restarted from beginning — new live session';
		} else {
			announcement = 'Demo restarted from beginning';
		}
	}

	// -- Live transport actions --
	function setTransport(next: 'static' | 'live') {
		if (!liveSession || next === transport) return;
		transport = next;
		writePref(TRANSPORT_KEY, next);
		if (next === 'live') {
			announcement = 'Live transport enabled — checking backend…';
			void probeBackend();
		} else {
			compareOpen = false;
			announcement = 'Static transport';
		}
	}

	async function probeBackend() {
		if (!liveSession) return;
		await liveSession.probe();
		// The user may have toggled back to static while the probe was in
		// flight; a backend announcement would be noise there.
		if (transport !== 'live') return;
		announcement =
			liveSession.backend === 'online' ? 'Live backend connected' : 'Live backend unreachable — static traces shown';
	}

	function newLiveSession() {
		if (!liveSession) return;
		liveSession.reset();
		compareOpen = false;
		announcement = 'New live session started';
	}

	async function runLiveStep() {
		if (!liveSession || !step.live) return;
		const target = step;
		await liveSession.run(target);
		if (liveSession.lastError) {
			announcement = `Live run failed: ${liveSession.lastError}`;
			return;
		}
		const result = liveSession.results[target.id];
		const count = result ? result.exchanges.length : 0;
		const prerequisite =
			result && result.ranPrerequisiteStepIds.length > 0
				? ` — prerequisite step ${result.ranPrerequisiteStepIds.join(', ')} ran first`
				: '';
		announcement = `Live run complete: ${count} exchange${count === 1 ? '' : 's'}${prerequisite}`;
	}

	function openCompare() {
		// Autoplay advancing the step would unmount the takeover mid-read and
		// drop focus with it, so opening the comparison stops the slideshow.
		autoPlay = false;
		compareOpen = true;
		announcement = `Comparison view opened for step ${step.id}`;
	}

	async function closeCompare() {
		compareOpen = false;
		announcement = 'Comparison view closed';
		// The panel unmounts with focus inside it; return focus to the Compare
		// button that opened it instead of letting it drop to <body>.
		await tick();
		document.getElementById(compareButtonId)?.focus();
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
		announcement = autoPlay
			? 'Autoplay started'
			: `Autoplay stopped at step ${currentStep + 1} of ${steps.length}: ${steps[currentStep].title}`;
	}

	function setCharShortcuts(enabled: boolean) {
		charShortcutsEnabled = enabled;
		writePref(CHAR_SHORTCUTS_KEY, String(enabled));
	}

	function toggleKbdHelp() {
		kbdHelpOpen = !kbdHelpOpen;
		writePref(KBD_HELP_KEY, kbdHelpOpen ? 'open' : 'collapsed');
	}

	// -- Keyboard handler --
	function handleKeydown(e: KeyboardEvent) {
		// Escape closes the compare takeover from anywhere.
		if (e.key === 'Escape' && compareOpen) {
			closeCompare();
			return;
		}
		// The takeover is modal: while it is open every other shortcut is
		// ignored, so navigation can't unmount the panel from under the user
		// and drop their focus to <body>.
		if (compareOpen) return;
		// Form fields own all their keys (arrows move the caret/selection).
		// Buttons and links only need protection from Space and character
		// keys — Space would fire the native click AND toggleAutoPlay() —
		// so arrow navigation stays live after clicking any toolbar button.
		const tag = (e.target as HTMLElement).tagName;
		const isFormField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
		if (!isFormField && e.key === 'ArrowLeft') {
			goBack();
			return;
		}
		if (!isFormField && e.key === 'ArrowRight') {
			goForward();
			return;
		}
		if (isFormField || tag === 'BUTTON' || tag === 'A') {
			return;
		}

		// Character shortcuts can be disabled (WCAG 2.1.4); arrows and Space stay active
		if (!charShortcutsEnabled && ['t', 'T', 'r', 'R', '1', '2', '3', 'l', 'L'].includes(e.key)) {
			return;
		}

		switch (e.key) {
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
			case 'l':
			case 'L':
				if (liveSession && viewMode === 'interactive') {
					setTransport(transport === 'live' ? 'static' : 'live');
				}
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
			announcement = `Autoplay stopped at step ${stepIndex + 1} of ${total}: ${steps[stepIndex].title}`;
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
			<FidelityNote fidelity={config.fidelity} class="mx-auto mt-1 max-w-3xl" />
		</div>

		<!-- Controls and Progress. In interactive mode this renders below the demo
		     panels as a sticky transport bar pinned to the viewport bottom; in
		     transcript mode it stays a plain toolbar at the top. -->
		{#snippet navBar()}
		<nav
			aria-label="Demo navigation"
			class="flex flex-wrap items-center justify-between gap-4 rounded-lg p-3 {viewMode === 'interactive'
				? 'sticky bottom-4 z-30 border border-edge bg-surface/95 shadow-xl backdrop-blur'
				: 'bg-surface'}"
		>
			<div class="flex flex-wrap items-center gap-2">
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
						<span aria-hidden="true">{'\u23EE'}</span> Restart
					</button>
					<span class="mx-1 text-ink-muted">|</span>

					<!-- Speed controls (keyboard-driven; hidden on touch-size screens) -->
					<div class="hidden items-center gap-1 sm:flex" role="group" aria-label="Playback speed">
						{#each SPEED_CONTROLS as { speed, label, text }}
							<button
								onclick={() => changeSpeed(speed)}
								aria-pressed={playbackSpeed === speed}
								aria-label={label}
								class="rounded-md border px-2 py-2 text-xs font-medium transition-colors motion-reduce:transition-none {playbackSpeed === speed
									? 'border-blue-500/50 bg-blue-900/30 text-blue-400'
									: 'border-edge bg-transparent text-ink-tertiary hover:border-edge-emphasis hover:text-ink-secondary'}"
							>
								{text}
							</button>
						{/each}
					</div>
					<span class="mx-1 hidden text-ink-muted sm:inline">|</span>

					<!-- Keyboard shortcuts help toggle (keyboard-driven; hidden on touch-size screens) -->
					<button
						onclick={toggleKbdHelp}
						aria-expanded={kbdHelpOpen}
						class="hidden rounded-md border px-3 py-2 text-xs font-medium transition-colors motion-reduce:transition-none sm:inline-flex {kbdHelpOpen
							? 'border-edge-emphasis bg-surface-raised text-ink-secondary'
							: 'border-edge bg-transparent text-ink-tertiary hover:border-edge-emphasis hover:text-ink-secondary'}"
					>
						Keyboard shortcuts
					</button>
					<span class="mx-1 hidden text-ink-muted sm:inline">|</span>
				{/if}
				<!-- Transport toggle - only for demos with a live config, in interactive mode -->
				{#if liveSession && viewMode === 'interactive'}
					<TransportToggle
						{transport}
						backend={liveSession.backend}
						sessionId={liveSession.sessionId}
						onchange={setTransport}
						onretry={() => void probeBackend()}
						onnewsession={newLiveSession}
					/>
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
					<!-- role="list" restores list semantics stripped by WebKit/VoiceOver for list-style:none -->
					<ol role="list" class="flex list-none items-center gap-1 overflow-x-auto sm:gap-1.5">
						{#each steps as s, i}
							{@const isCompleted = i < currentStep}
							{@const isCurrent = i === currentStep}
							{@const isPending = i > currentStep}
							<li class="flex-shrink-0 {showLiveUi ? 'flex flex-col items-center' : ''}">
								<button
									onclick={() => currentStep = i}
									aria-current={isCurrent ? 'step' : undefined}
									aria-label="Step {i + 1}: {s.title}{isCompleted ? ' (completed)' : ''}{showLiveUi && s.live
										? liveSession?.results[s.id]
											? ' (live result captured)'
											: ' (live available)'
										: ''}"
									class="flex items-center justify-center rounded-full p-0.5 transition-all motion-reduce:transition-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:p-1 {isCurrent
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
								{#if showLiveUi}
									<!-- Live-capable underbar; transparent spacer keeps dot centers aligned -->
									<span class="mt-0.5 h-0.5 w-3 rounded-full {s.live ? 'bg-emerald-400' : 'bg-transparent'}" aria-hidden="true"></span>
								{/if}
							</li>
						{/each}
					</ol>
					<span class="flex-shrink-0 text-xs font-medium text-ink-secondary sm:text-sm">
						Step {currentStep + 1} of {steps.length}
					</span>
					<span class="hidden sm:inline max-w-48 truncate text-ink-tertiary">
						&middot; {step.title}
					</span>
				</div>
			{/if}
			<!-- Keyboard shortcuts help: full-width final row, expands the pinned bar
			     upward when toggled. Keyboard-only concept, hidden on touch-size screens. -->
			{#if viewMode === 'interactive' && kbdHelpOpen}
				<div id="kbd-help-panel" class="hidden w-full border-t border-edge pt-3 text-xs text-ink-tertiary sm:block">
					<div class="font-semibold text-ink-secondary mb-2 sm:mb-0 sm:inline">Keyboard: </div>
					<div class="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:inline-flex sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
						<span><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono">&larr;</kbd><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono ml-0.5">&rarr;</kbd> Navigate</span>
						<span><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono">Space</kbd> Autoplay</span>
						<span><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono">R</kbd> Restart</span>
						<span><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono">1</kbd><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono ml-0.5">2</kbd><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono ml-0.5">3</kbd> Speed</span>
						<span><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono">T</kbd> Transcript</span>
						{#if liveSession}
							<span><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono">L</kbd> Live transport</span>
						{/if}
					</div>
					<label class="mt-2 flex w-fit items-center gap-2 border-t border-edge pt-2 text-ink-tertiary sm:mt-3">
						<input
							type="checkbox"
							checked={charShortcutsEnabled}
							onchange={(e) => setCharShortcuts(e.currentTarget.checked)}
							class="h-3.5 w-3.5 accent-blue-500"
						/>
						Single-key shortcuts ({liveSession ? 'T, R, L, 1-3' : 'T, R, 1-3'})
					</label>
				</div>
			{/if}
		</nav>
		{/snippet}

		<!-- Live region for screen reader announcements.
		     Per-step announcements are suppressed during autoplay to avoid spamming
		     screen readers at short intervals; start/stop are announced instead. -->
		{#snippet liveRegion()}
		<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
			{announcement || (autoPlay ? '' : `Step ${currentStep + 1} of ${steps.length}: ${step.title}`)}
		</div>
		{/snippet}

		<!-- Conditional: Interactive demo or Transcript view.
		     Interactive mode is content-first: the stage (step description + panels)
		     comes before the transport bar, which sticks to the viewport bottom. -->
		{#if viewMode === 'transcript'}
			{@render navBar()}
			{@render liveRegion()}
			<TranscriptView {steps} {config} />
		{:else}
			{@render liveRegion()}
			<!-- Step description -->
			<div class="grid min-h-32 grid-cols-1 items-center gap-6 rounded-lg border border-edge bg-surface px-5 py-4 lg:grid-cols-[1fr_auto]">
				<!-- Left: Step info -->
				<div class="flex items-center gap-4">
					<div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold shadow-lg shadow-blue-500/20">
						{step.id}
					</div>
					<div class="flex-1">
						<h2 class="text-xl font-bold text-ink">
							{step.title}
						</h2>
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
						<div>
							<p class="text-[10px] font-semibold uppercase tracking-wider text-amber-500">
								Security
							</p>
							<p class="text-xs leading-relaxed text-ink-tertiary">
								{step.securityNote}
							</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Main content -->
			<main id="main-content" class="grid min-h-[50rem] grid-cols-1 gap-5 lg:grid-cols-2">
				{#if compareOpen && liveSession && liveResult}
					<!-- Full-width static-versus-live takeover of both columns -->
					<div class="min-w-0 lg:col-span-2">
						<LiveComparePanel {step} result={liveResult} actorConfig={config.actorConfig} onclose={closeCompare} />
					</div>
				{:else}
				<!-- Left: User view -->
				<div class="flex flex-col gap-3">
					<h3 class="flex items-center gap-2.5 text-base font-semibold">
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
					</h3>
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
					<div class="flex flex-wrap items-start justify-between gap-2">
						<h3 class="flex items-center gap-2.5 text-base font-semibold">
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
						</h3>
						{#if showLiveUi && liveSession}
							<LiveRunControls
								{step}
								{steps}
								session={liveSession}
								onrun={() => void runLiveStep()}
								onretry={() => void probeBackend()}
								onopencompare={openCompare}
								{compareButtonId}
							/>
						{/if}
					</div>
					<div class="flex flex-1 flex-col rounded-lg border border-edge bg-surface p-4">
						{#if showLiveUi && liveSession && liveSession.backend === 'offline'}
							<div
								role="note"
								aria-label="Live backend unreachable"
								class="mb-3 rounded border border-amber-500/30 bg-amber-900/20 px-3 py-2 text-xs text-amber-200"
							>
								Live backend unreachable &mdash; showing static traces. The demo is fully functional without it.
							</div>
						{/if}
						<!-- scrollbar-gutter:stable on both this wrapper and the entries list
						     keeps the actor columns and FlowTrack rungs horizontally aligned
						     when the list grows a scrollbar -->
						<div class="overflow-hidden [scrollbar-gutter:stable]">
							<ActorDiagram
								actors={step.actors}
								actorConfig={config.actorConfig}
							/>
						</div>
						<!-- role="list" restores list semantics stripped by WebKit/VoiceOver for list-style:none -->
						<ol role="list" class="mb-4 flex-1 list-none space-y-3 overflow-y-auto [scrollbar-gutter:stable]">
							{#each step.http as entry}
								<li>
									<FlowTrack from={entry.from} to={entry.to} type={entry.type} actorConfig={config.actorConfig} />
									<HttpEntry {entry} actorConfig={config.actorConfig} />
								</li>
							{/each}
						</ol>
						<!-- Legend - colors from sso-demo-theme.css -->
						<div class="mt-auto border-t border-edge pt-4">
							<h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
								Legend
							</h4>
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
				{/if}
			</main>

			<!-- Transport bar: sticky, pinned to the viewport bottom until the page
			     end scrolls into view -->
			{@render navBar()}

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
