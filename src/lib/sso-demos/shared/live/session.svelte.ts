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

	// Staleness guards (non-reactive; only read/written inside actions).
	// generation invalidates in-flight run()s across reset(): a run that
	// resolves after New session/Restart must not commit results, captures,
	// or errors from the old server session into the fresh one.
	let generation = 0;
	// probeToken invalidates an in-flight probe once a newer probe starts or
	// a run outcome has already settled backend: a slow /healthz answer must
	// not overwrite fresher knowledge (e.g. flip a just-proven 'online' back
	// to 'offline').
	let probeToken = 0;

	async function probe(): Promise<void> {
		const token = ++probeToken;
		backend = 'checking';
		const status = await probeLiveBackend(resolveBaseUrl(configLive));
		if (token !== probeToken) return;
		backend = status === 'up' ? 'online' : 'offline';
	}

	/** Leading status code of a step result's last exchange, 0 when absent. */
	function lastStatusCode(result: LiveStepResult): number {
		const last = result.exchanges[result.exchanges.length - 1];
		return Number.parseInt(last?.response?.status ?? '0', 10);
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
		probeToken++; // a run outcome supersedes any probe still in flight
		backend = 'offline';
	}

	async function run(step: Step): Promise<void> {
		if (!step.live || runningStepId !== null) return;
		const sid = sessionId ?? crypto.randomUUID();
		sessionId = sid;
		const gen = generation;
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
				if (gen !== generation) return; // session was reset mid-run; discard
				const failed = prerequisiteResult.exchanges.find((exchange) => !exchange.ok);
				if (failed) {
					failRun(step.id, failed.error ?? 'Live request failed');
					return;
				}
				// Commit the prerequisite result under its own step id so the
				// user can inspect what actually ran, then stop here when the
				// server declined it (409 replay, 429 rate limit, ...): running
				// the main step would only die on the missing capture.
				results[prerequisite.id] = prerequisiteResult;
				Object.assign(ctx, prerequisiteResult.captured);
				Object.assign(captures, prerequisiteResult.captured);
				const code = lastStatusCode(prerequisiteResult);
				if (code < 200 || code >= 300) {
					const last = prerequisiteResult.exchanges[prerequisiteResult.exchanges.length - 1];
					lastError = `Prerequisite step ${prerequisite.id} returned ${last?.response?.status ?? 'no response'} — its response is shown on step ${prerequisite.id}; start a new session for a fresh run.`;
					lastErrorStepId = step.id;
					return;
				}
				ranPrerequisiteStepIds.push(prerequisite.id);
			}

			const result = await runStep(step, ctx, opts);
			if (gen !== generation) return; // session was reset mid-run; discard
			const failed = result.exchanges.find((exchange) => !exchange.ok);
			if (failed) {
				failRun(step.id, failed.error ?? 'Live request failed');
				return;
			}
			result.ranPrerequisiteStepIds = ranPrerequisiteStepIds;
			results[step.id] = result;
			Object.assign(captures, result.captured);
			// A successful round trip is proof of connectivity, superseding any
			// probe still in flight.
			probeToken++;
			backend = 'online';
		} catch (error) {
			if (gen !== generation) return; // stale error from a pre-reset run
			// Placeholder/capture contract bugs: surfaced inline, not swallowed.
			lastError = error instanceof Error ? error.message : String(error);
			lastErrorStepId = step.id;
		} finally {
			runningStepId = null;
		}
	}

	function reset(): void {
		generation++;
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
