<script lang="ts">
	import type { Component } from 'svelte';
	import { tick } from 'svelte';
	import { browser } from '$app/environment';
	import BrowserMockup from './BrowserMockup.svelte';
	import HttpEntry from './HttpEntry.svelte';
	import ActorDiagram from './ActorDiagram.svelte';
	import FlowTrack from './FlowTrack.svelte';
	import TranscriptView from './TranscriptView.svelte';
	import FidelityNote from './FidelityNote.svelte';
	import TransportToggle from './live/TransportToggle.svelte';
	import LiveRunControls from './live/LiveRunControls.svelte';
	import LiveComparePanel from './live/LiveComparePanel.svelte';
	import { createLiveSession } from './live/session.svelte.js';
	import type { Step, DemoConfig } from '../types.js';

	/** localStorage keys for persisted UI preferences */
	const CHAR_SHORTCUTS_KEY = 'ssowhat:char-shortcuts';
	const KBD_HELP_KEY = 'ssowhat:kbd-help';
	const SECURITY_NOTE_KEY = 'ssowhat:security-note';
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
	let viewMode = $state<'interactive' | 'transcript'>('interactive');
	let announcement = $state('');
	// Single-character shortcut opt-out (WCAG 2.1.4), keyboard-help visibility
	// and the security-note disclosure (all closed by default) are persisted
	// across visits. Initialized to SSR-safe defaults; persisted prefs are
	// loaded client-only in an effect below to avoid a hydration mismatch
	// against the prerendered markup.
	let charShortcutsEnabled = $state(true);
	let kbdHelpOpen = $state(false);
	let securityNoteOpen = $state(false);
	let aboutOpen = $state(false);
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

	// Hydration-stable ids for aria-controls wiring and for returning focus to
	// the Compare button after the takeover unmounts.
	const uid = $props.id();
	const compareButtonId = `${uid}-compare-open`;
	const stepHeadingId = `${uid}-step-heading`;
	const securityNoteId = `${uid}-security-note`;
	const kbdHelpId = `${uid}-kbd-help`;
	const aboutPanelId = `${uid}-about`;

	// -- Derived --
	let step = $derived(steps[currentStep]);
	let ScreenComponent = $derived(screens[step.userSees]);
	let showLiveUi = $derived(transport === 'live' && liveSession !== null);
	let liveResult = $derived(liveSession ? liveSession.results[step.id] : undefined);
	// The browser mockup's progress bar tracks position in the demo.
	let demoProgress = $derived(Math.round(((currentStep + 1) / steps.length) * 100));

	// Load persisted UI prefs after mount. Effects run client-only, so reading
	// localStorage here (rather than in the $state initializers) keeps the first
	// client render identical to the prerendered HTML.
	$effect(() => {
		charShortcutsEnabled = readPref(CHAR_SHORTCUTS_KEY) !== 'false';
		kbdHelpOpen = readPref(KBD_HELP_KEY) === 'open';
		securityNoteOpen = readPref(SECURITY_NOTE_KEY) === 'open';
		// Restoring the pref does NOT probe the backend -- probes are lazy
		// (toggle click, pill retry, run failure), never on page load.
		if (liveSession && readPref(TRANSPORT_KEY) === 'live') {
			transport = 'live';
		}
	});

	// The compare takeover is a per-step view; close it whenever the step
	// changes. The only way to change steps while it is open is pointer
	// navigation (shortcuts are modal-guarded), and there focus stays on the
	// control the user clicked, so closing without closeCompare()'s focus
	// restoration is safe.
	$effect(() => {
		void currentStep;
		compareOpen = false;
	});

	// -- Actions --
	function toggleViewMode() {
		viewMode = viewMode === 'interactive' ? 'transcript' : 'interactive';
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

	function goBack() {
		currentStep = Math.max(0, currentStep - 1);
	}

	function goForward() {
		currentStep = Math.min(steps.length - 1, currentStep + 1);
	}

	function goToStep(index: number) {
		currentStep = index;
	}

	function setCharShortcuts(enabled: boolean) {
		charShortcutsEnabled = enabled;
		writePref(CHAR_SHORTCUTS_KEY, String(enabled));
	}

	function toggleKbdHelp() {
		kbdHelpOpen = !kbdHelpOpen;
		writePref(KBD_HELP_KEY, kbdHelpOpen ? 'open' : 'collapsed');
	}

	function toggleSecurityNote() {
		securityNoteOpen = !securityNoteOpen;
		writePref(SECURITY_NOTE_KEY, securityNoteOpen ? 'open' : 'collapsed');
	}

	function toggleAbout() {
		aboutOpen = !aboutOpen;
	}

	// -- Keyboard handler --
	function handleKeydown(e: KeyboardEvent) {
		// Escape closes the compare takeover from anywhere, then any open popover.
		if (e.key === 'Escape') {
			if (compareOpen) {
				closeCompare();
			} else if (aboutOpen) {
				aboutOpen = false;
			} else if (kbdHelpOpen) {
				toggleKbdHelp();
			}
			return;
		}
		// The takeover is modal: while it is open every other shortcut is
		// ignored, so navigation can't unmount the panel from under the user
		// and drop their focus to <body>.
		if (compareOpen) return;
		// Form fields own all their keys (arrows move the caret/selection).
		// Buttons and links only need protection from character keys, so
		// arrow navigation stays live after clicking any control.
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

		// Character shortcuts can be disabled (WCAG 2.1.4); arrows stay active
		if (!charShortcutsEnabled) return;

		switch (e.key) {
			case 't':
			case 'T':
				e.preventDefault();
				toggleViewMode();
				break;
			case 'l':
			case 'L':
				if (liveSession && viewMode === 'interactive') {
					setTransport(transport === 'live' ? 'static' : 'live');
				}
				break;
		}
	}

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
	Handles navigation, keyboard controls, and layout.

	Visual hierarchy, top to bottom: the current step (numbered title,
	description, chapter list with Previous/Next) is the dominant element;
	the two panes come second; the security note, legend and protocol labels
	are support; page identity (title, disclaimer, version) sits at breadcrumb
	weight in the header and footer.
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
		<!-- View mode toggle - always visible -->
		{#snippet viewModeToggle()}
			<button
				onclick={toggleViewMode}
				aria-pressed={viewMode === 'transcript'}
				aria-label={viewMode === 'interactive' ? 'Switch to transcript view' : 'Switch to interactive view'}
				class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors motion-reduce:transition-none {viewMode === 'transcript'
					? 'border-amber-500/50 bg-amber-900/30 text-amber-400 hover:bg-amber-900/50'
					: 'border-edge bg-transparent text-ink-tertiary hover:border-edge-emphasis hover:text-ink-secondary'}"
			>
				{#if viewMode === 'transcript'}
					<span aria-hidden="true">&#x25C0;</span> Interactive
				{:else}
					<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<path d="M14 2v6h6M8 13h8M8 17h8" />
					</svg>
					Transcript
				{/if}
			</button>
		{/snippet}

		<!-- Live region for screen reader announcements. -->
		{#snippet liveRegion()}
			<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
				{announcement || `Step ${currentStep + 1} of ${steps.length}: ${step.title}`}
			</div>
		{/snippet}

		{#if viewMode === 'transcript'}
			<!-- TranscriptView renders its own header (title, subtitle, fidelity
			     note); the shell only keeps the way back to the interactive view. -->
			<div class="flex items-center justify-end">
				{@render viewModeToggle()}
			</div>
			{@render liveRegion()}
			<TranscriptView {steps} {config} />
		{:else}
			{@render liveRegion()}

			<!-- Header: page identity at breadcrumb weight, one row -->
			<header class="flex flex-col border-b border-edge pb-2.5">
				<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
					<div class="flex min-w-0 flex-wrap items-baseline gap-x-3.5 gap-y-1">
						<a
							href={config.backLink.href}
							class="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ink-muted transition-colors hover:text-ink-secondary"
						>
							&larr; {config.backLink.label}
						</a>
						<span class="hidden h-3.5 w-px self-center bg-edge-emphasis sm:block" aria-hidden="true"></span>
						<h1 class="whitespace-nowrap text-sm font-medium text-ink-secondary">
							{config.title}
						</h1>
						<p class="hidden min-w-0 truncate text-sm text-ink-muted md:block">{config.subtitle}</p>
					</div>
					<div class="flex flex-shrink-0 items-center gap-2">
						<!-- Transport toggle - only for demos with a live config -->
						{#if liveSession}
							<TransportToggle
								{transport}
								backend={liveSession.backend}
								sessionId={liveSession.sessionId}
								onchange={setTransport}
								onretry={() => void probeBackend()}
								onnewsession={newLiveSession}
							/>
						{/if}
						{@render viewModeToggle()}
						<!-- Keyboard shortcuts help toggle (keyboard-driven; hidden on touch-size screens) -->
						<button
							onclick={toggleKbdHelp}
							aria-expanded={kbdHelpOpen}
							aria-controls={kbdHelpId}
							aria-label="Keyboard shortcuts"
							class="hidden h-[30px] w-[30px] items-center justify-center rounded-md border transition-colors motion-reduce:transition-none sm:inline-flex {kbdHelpOpen
								? 'border-edge-emphasis bg-surface-raised text-ink-secondary'
								: 'border-edge bg-transparent text-ink-tertiary hover:border-edge-emphasis hover:text-ink-secondary'}"
						>
							<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<rect x="2" y="5" width="20" height="14" rx="2" />
								<path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M8 13h.01M12 13h.01M16 13h.01M7 16h10" />
							</svg>
						</button>
					</div>
				</div>
				<!-- Keyboard shortcuts help. Keyboard-only concept, hidden on touch-size screens. -->
				{#if kbdHelpOpen}
					<div id={kbdHelpId} class="mt-2.5 hidden border-t border-edge pt-2.5 text-xs text-ink-tertiary sm:block">
						<span class="font-semibold text-ink-secondary">Keyboard: </span>
						<span class="inline-flex flex-wrap gap-x-4 gap-y-2">
							<span><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono">&larr;</kbd><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono ml-0.5">&rarr;</kbd> Navigate</span>
							<span><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono">T</kbd> Transcript</span>
							{#if liveSession}
								<span><kbd class="rounded bg-surface-raised px-1.5 py-0.5 font-mono">L</kbd> Live transport</span>
							{/if}
						</span>
						<label class="mt-2 flex w-fit items-center gap-2 text-ink-tertiary">
							<input
								type="checkbox"
								checked={charShortcutsEnabled}
								onchange={(e) => setCharShortcuts(e.currentTarget.checked)}
								class="h-3.5 w-3.5 accent-blue-500"
							/>
							Single-key shortcuts ({liveSession ? 'T, L' : 'T'})
						</label>
					</div>
				{/if}
			</header>

			<!-- Step masthead: the dominant element on the page -->
			<section
				aria-labelledby={stepHeadingId}
				class="rounded-lg border border-edge bg-surface px-6 pt-5 pb-[18px]"
			>
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-10">
					<!-- Left: current step -->
					<div class="min-w-0">
						<h2 id={stepHeadingId} class="text-2xl font-bold tracking-tight text-ink">
							<span class="text-ink-tertiary tabular-nums">{step.id}.</span>
							{step.title}
						</h2>
						<p class="mt-2.5 max-w-[66ch] text-sm leading-relaxed text-ink-secondary text-pretty">
							{step.description}
						</p>
						{#if step.securityNote}
							<!-- Optional depth for the subset of readers who want it; the
							     disclosure state persists across steps and visits. -->
							<button
								onclick={toggleSecurityNote}
								aria-expanded={securityNoteOpen}
								aria-controls={securityNoteId}
								class="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-500 transition-colors motion-reduce:transition-none hover:text-amber-400 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded"
							>
								<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
								</svg>
								<span>Security note</span>
								<svg
									class="h-3 w-3 transition-transform motion-reduce:transition-none {securityNoteOpen ? 'rotate-90' : ''}"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path d="M9 6l6 6-6 6" />
								</svg>
							</button>
							{#if securityNoteOpen}
								<p id={securityNoteId} class="mt-2.5 max-w-[66ch] text-xs leading-relaxed text-ink-tertiary text-pretty">
									{step.securityNote}
								</p>
							{/if}
						{/if}
					</div>

					<!-- Right: chapter list plus the two controls that move through it -->
					<nav aria-label="Demo steps" class="flex flex-col gap-2.5">
						<!-- role="list" restores list semantics stripped by WebKit/VoiceOver for list-style:none -->
						<ol role="list" class="flex list-none flex-col gap-1 text-xs">
							{#each steps as s, i}
								{@const isCompleted = i < currentStep}
								{@const isCurrent = i === currentStep}
								{@const liveState =
									showLiveUi && s.live
										? liveSession?.results[s.id]
											? ' (live result captured)'
											: ' (live available)'
										: ''}
								<li>
									<button
										onclick={() => goToStep(i)}
										aria-current={isCurrent ? 'step' : undefined}
										aria-label="Step {i + 1}: {s.title}{isCompleted ? ' (completed)' : ''}{liveState}"
										class="flex w-full items-center gap-2.5 rounded-md px-2 py-[3px] text-left transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface {isCurrent
											? 'bg-accent-dim'
											: 'hover:bg-surface-raised/60'}"
									>
										<span
											class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold {isCurrent
												? 'bg-blue-500 font-bold text-white ring-2 ring-blue-300 ring-offset-2 ring-offset-surface'
												: isCompleted
													? 'bg-emerald-500 text-white'
													: 'border-[1.5px] border-dashed border-edge-emphasis bg-surface-raised text-ink-muted'}"
											aria-hidden="true"
										>
											{#if isCompleted}
												<svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
												</svg>
											{:else}
												{i + 1}
											{/if}
										</span>
										<span class="truncate {isCurrent ? 'font-semibold text-ink' : 'text-ink-tertiary'}">{s.title}</span>
										{#if showLiveUi && s.live}
											<!-- Live-capable marker -->
											<span class="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" aria-hidden="true"></span>
										{/if}
									</button>
								</li>
							{/each}
						</ol>
						<div class="grid grid-cols-2 gap-2 border-t border-edge pt-2.5">
							<button
								onclick={goBack}
								disabled={currentStep === 0}
								class="rounded-md border border-edge bg-transparent px-3 py-2 text-sm font-medium text-ink-secondary transition-colors motion-reduce:transition-none hover:border-edge-emphasis hover:bg-surface-raised hover:text-ink disabled:cursor-not-allowed disabled:border-edge disabled:text-ink-muted disabled:hover:bg-transparent"
							>
								&larr; Previous
							</button>
							<button
								onclick={goForward}
								disabled={currentStep === steps.length - 1}
								class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-colors motion-reduce:transition-none hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-ink-muted disabled:shadow-none"
							>
								Next &rarr;
							</button>
						</div>
					</nav>
				</div>
			</section>

			<!-- Main content -->
			<main id="main-content" class="grid grid-cols-1 gap-5 lg:min-h-[37.5rem] lg:grid-cols-2">
				{#if compareOpen && liveSession && liveResult}
					<!-- Full-width static-versus-live takeover of both columns -->
					<div class="min-w-0 lg:col-span-2">
						<LiveComparePanel {step} result={liveResult} actorConfig={config.actorConfig} onclose={closeCompare} />
					</div>
				{:else}
				<!-- Left: User view -->
				<div class="flex flex-col gap-2.5">
					<h3 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
						<svg
							class="h-3.5 w-3.5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							<path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
						</svg>
						What the user sees
					</h3>
					<BrowserMockup urlBar={step.urlBar} loadingProgress={demoProgress} loadingDuration={300}>
						{#if ScreenComponent}
							<ScreenComponent />
						{/if}
					</BrowserMockup>
				</div>

				<!-- Right: Technical view -->
				<div class="flex flex-col gap-2.5">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<h3 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
							<svg
								class="h-3.5 w-3.5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
								connections={config.protocolStack.connections}
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
						<!-- Legend - one quiet row; colors from sso-demo-theme.css -->
						<div class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-edge pt-3 text-xs text-ink-muted">
							<h4 class="mr-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">Legend</h4>
							<div class="flex items-center gap-1.5">
								<div class="h-2.5 w-2.5 rounded-sm border-l-[3px] border-http-request bg-http-request/25"></div>
								<span>Browser request</span>
							</div>
							<div class="flex items-center gap-1.5">
								<div class="h-2.5 w-2.5 rounded-sm border-l-[3px] border-http-response bg-http-response/25"></div>
								<span>Server response</span>
							</div>
							<div class="flex items-center gap-1.5">
								<div class="h-2.5 w-2.5 rounded-sm border-l-[3px] border-http-server bg-http-server/25"></div>
								<span>Server-to-server</span>
							</div>
							<div class="flex items-center gap-1.5">
								<div class="h-2.5 w-2.5 rounded-sm border-l-[3px] border-http-internal bg-white/[0.06]"></div>
								<span>Internal</span>
							</div>
						</div>
					</div>
				</div>
				{/if}
			</main>

			<!-- Footer: the plain statement stays visible; the full fidelity text
			     sits behind the info button. -->
			<footer class="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-ink-muted">
				<a
					href={config.backLink.href}
					class="flex items-center gap-1 text-ink-muted transition-colors hover:text-ink-secondary"
				>
					&larr; {config.backLink.label}
				</a>
				<div class="relative flex items-center gap-2">
					<span>An educational demo, not a reference implementation</span>
					<button
						onclick={toggleAbout}
						aria-expanded={aboutOpen}
						aria-controls={aboutPanelId}
						aria-label="About this demo"
						class="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas {aboutOpen
							? 'bg-surface-raised text-ink-secondary'
							: 'text-ink-muted hover:bg-surface-raised hover:text-ink-secondary'}"
					>
						<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<circle cx="12" cy="12" r="9" />
							<path d="M12 16v-4M12 8h.01" />
						</svg>
					</button>
					{#if aboutOpen}
						<div
							id={aboutPanelId}
							class="absolute right-0 bottom-[calc(100%+10px)] w-[min(27.5rem,calc(100vw-2rem))] rounded-lg border border-edge-emphasis bg-surface p-3.5 text-left text-xs leading-relaxed text-ink-tertiary shadow-xl text-pretty"
						>
							<p>
								This is an educational demo, not a reference implementation. Any live mode uses a mock service, not a vendor system.
							</p>
							<FidelityNote fidelity={config.fidelity} class="mt-2" />
							<span
								class="absolute -bottom-[6px] right-1.5 h-2.5 w-2.5 rotate-45 border-r border-b border-edge-emphasis bg-surface"
								aria-hidden="true"
							></span>
						</div>
					{/if}
					<span class="rounded bg-surface px-1.5 py-0.5 font-mono text-ink-muted">
						v{config.version}
					</span>
				</div>
			</footer>
		{/if}
	</div>
</div>
