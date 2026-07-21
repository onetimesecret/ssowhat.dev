// src/lib/sso-demos/shared/live/session.svelte.ts

// Runes-based live-session state. Owns the reactive session id, backend
// status, per-step results and captured variables so SSODemoShell stays
// declarative. In-memory only: a page reload is a fresh session, matching the
// mock server's scoped-session model.

import type { LiveDemoConfig, LiveStepResult, Step } from '../../types.js';
import { DEMO_TOKEN, resolveBaseUrl } from './config.js';
import { probeLiveBackend, runStep } from './executor.js';

/** Backend reachability as seen by the lazy probe and run outcomes. */
export type BackendStatus = 'unknown' | 'checking' | 'online' | 'offline';

/** Reactive live-session state and actions consumed by the shell and live components. */
export interface LiveSession {
	/** Client session UUID; null until the first run mints one lazily */
	readonly sessionId: string | null;
	/** Backend reachability status */
	readonly backend: BackendStatus;
	/** Successful step results, keyed by step id */
	readonly results: Record<number, LiveStepResult>;
	/** Captured variables shared across steps (e.g. userId) */
	readonly captures: Record<string, string>;
	/** Step id currently running, or null; disables run buttons and drives spinners */
	readonly runningStepId: number | null;
	/** Human-readable description of the last failed run, or null */
	readonly lastError: string | null;
	/** Step id the last error belongs to, so the inline banner renders on the right step */
	readonly lastErrorStepId: number | null;
	/** Probes GET /healthz and updates backend status */
	probe(): Promise<void>;
	/** Runs a step's live exchanges, auto-running capture prerequisites visibly */
	run(step: Step): Promise<void>;
	/** Mints a new session UUID and clears results, captures, and errors */
	reset(): void;
}

/**
 * Creates the reactive live session for a demo. Returns null when the demo
 * has no live config, which keeps every live code path inert for it.
 */
export function createLiveSession(configLive: LiveDemoConfig | undefined, steps: Step[]): LiveSession | null {
	if (!configLive) return null;

	let sessionId = $state<string | null>(null);
	let backend = $state<BackendStatus>('unknown');
	let results = $state<Record<number, LiveStepResult>>({});
	let captures = $state<Record<string, string>>({});
	let runningStepId = $state<number | null>(null);
	let lastError = $state<string | null>(null);
	let lastErrorStepId = $state<number | null>(null);

	async function probe(): Promise<void> {
		backend = 'checking';
		const status = await probeLiveBackend(resolveBaseUrl(configLive));
		backend = status === 'up' ? 'online' : 'offline';
	}

	/** Finds the earlier step whose live exchanges capture the given variable. */
	function findPrerequisiteStep(variable: string, forStep: Step): Step | undefined {
		return steps.find(
			(candidate) =>
				candidate.id < forStep.id &&
				candidate.live !== undefined &&
				candidate.live.exchanges.some((exchange) => exchange.capture !== undefined && variable in exchange.capture)
		);
	}

	function failRun(stepId: number, error: string): void {
		// Failed runs keep the prior cached result; the inline banner and the
		// offline pill carry the news instead.
		lastError = error;
		lastErrorStepId = stepId;
		backend = 'offline';
	}

	async function run(step: Step): Promise<void> {
		if (!step.live || runningStepId !== null) return;
		const sid = sessionId ?? crypto.randomUUID();
		sessionId = sid;
		runningStepId = step.id;
		lastError = null;
		lastErrorStepId = null;
		try {
			const opts = { baseUrl: resolveBaseUrl(configLive), sessionId: sid, token: DEMO_TOKEN };
			const ctx: Record<string, string> = { ...captures };
			const ranPrerequisiteStepIds: number[] = [];

			// Auto-run prerequisites, visibly: their results are cached under
			// their own step ids and recorded in ranPrerequisiteStepIds.
			for (const variable of step.live.requires ?? []) {
				if (ctx[variable] !== undefined) continue;
				const prerequisite = findPrerequisiteStep(variable, step);
				if (!prerequisite) continue; // runStep will throw naming the variable
				const prerequisiteResult = await runStep(prerequisite, ctx, opts);
				const failed = prerequisiteResult.exchanges.find((exchange) => !exchange.ok);
				if (failed) {
					failRun(step.id, failed.error ?? 'Live request failed');
					return;
				}
				results[prerequisite.id] = prerequisiteResult;
				Object.assign(ctx, prerequisiteResult.captured);
				Object.assign(captures, prerequisiteResult.captured);
				ranPrerequisiteStepIds.push(prerequisite.id);
			}

			const result = await runStep(step, ctx, opts);
			const failed = result.exchanges.find((exchange) => !exchange.ok);
			if (failed) {
				failRun(step.id, failed.error ?? 'Live request failed');
				return;
			}
			result.ranPrerequisiteStepIds = ranPrerequisiteStepIds;
			results[step.id] = result;
			Object.assign(captures, result.captured);
			// A successful round trip is proof of connectivity.
			backend = 'online';
		} catch (error) {
			// Placeholder/capture contract bugs: surfaced inline, not swallowed.
			lastError = error instanceof Error ? error.message : String(error);
			lastErrorStepId = step.id;
		} finally {
			runningStepId = null;
		}
	}

	function reset(): void {
		sessionId = crypto.randomUUID();
		results = {};
		captures = {};
		lastError = null;
		lastErrorStepId = null;
	}

	return {
		get sessionId() {
			return sessionId;
		},
		get backend() {
			return backend;
		},
		get results() {
			return results;
		},
		get captures() {
			return captures;
		},
		get runningStepId() {
			return runningStepId;
		},
		get lastError() {
			return lastError;
		},
		get lastErrorStepId() {
			return lastErrorStepId;
		},
		probe,
		run,
		reset,
	};
}
