// src/lib/sso-demos/shared/live/executor.ts

// Pure-TS live-exchange executor: performs real HTTP exchanges against the
// mock-integration server and formats the results into the exact HttpMessage
// display shapes the existing UI consumes (status "201 Created", headers as
// pre-formatted "Name: value" lines, canonical 2-space JSON bodies). No Svelte
// imports -- fully unit-testable under node.

import type { HttpMessage, LiveExchangeSpec, LiveExchangeResult, LiveStepResult, Step } from '../../types.js';

/** Per-exchange fetch timeout in milliseconds. */
export const EXCHANGE_TIMEOUT_MS = 8000;

/** Backend probe timeout in milliseconds. */
export const PROBE_TIMEOUT_MS = 2500;

/**
 * Reason phrases for the statuses the mock server can emit. fetch gives an
 * empty statusText on HTTP/2, so the executor carries this table to keep live
 * status lines byte-matching the static ones ("201 Created").
 */
export const REASON_PHRASES: Record<number, string> = {
	200: 'OK',
	201: 'Created',
	204: 'No Content',
	400: 'Bad Request',
	401: 'Unauthorized',
	404: 'Not Found',
	409: 'Conflict',
	413: 'Payload Too Large',
	429: 'Too Many Requests',
	500: 'Internal Server Error',
};

/**
 * Thrown when a {{placeholder}} in a path or body has no value in the capture
 * context. A hard client-side error: `{{userId}}` must never go over the wire.
 */
export class LivePlaceholderError extends Error {
	/** The placeholder names that could not be resolved */
	readonly unresolved: string[];

	constructor(unresolved: string[]) {
		super(`Unresolved live placeholder${unresolved.length === 1 ? '' : 's'}: ${unresolved.join(', ')}`);
		this.name = 'LivePlaceholderError';
		this.unresolved = unresolved;
	}
}

/**
 * Thrown when a capture dot-path does not resolve in a 2xx response body.
 * Surfaced loudly -- a missing capture on a success response is a contract bug.
 */
export class LiveCaptureError extends Error {
	constructor(variable: string, path: string) {
		super(`Capture path "${path}" for variable "${variable}" not found in response JSON`);
		this.name = 'LiveCaptureError';
	}
}

/**
 * Substitutes `{{name}}` placeholders from the capture context. Throws
 * LivePlaceholderError naming every unresolved variable. JSON braces are
 * untouched -- only the exact double-brace form is a placeholder.
 */
export function resolvePlaceholders(template: string, ctx: Record<string, string>): string {
	const unresolved: string[] = [];
	const resolved = template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
		const value = ctx[name];
		if (value === undefined) {
			if (!unresolved.includes(name)) unresolved.push(name);
			return match;
		}
		return value;
	});
	if (unresolved.length > 0) throw new LivePlaceholderError(unresolved);
	return resolved;
}

/**
 * Extracts values from parsed response JSON by dot-path (numeric segments
 * index arrays), e.g. `{ userId: 'id' }` or `{ firstId: 'Resources.0.id' }`.
 * Throws LiveCaptureError when a path does not resolve.
 */
export function captureFromJson(json: unknown, paths: Record<string, string>): Record<string, string> {
	const captured: Record<string, string> = {};
	for (const [variable, path] of Object.entries(paths)) {
		let node: unknown = json;
		for (const segment of path.split('.')) {
			if (Array.isArray(node) && /^\d+$/.test(segment)) {
				node = node[Number(segment)];
			} else if (node !== null && typeof node === 'object' && segment in (node as Record<string, unknown>)) {
				node = (node as Record<string, unknown>)[segment];
			} else {
				node = undefined;
			}
			if (node === undefined) break;
		}
		if (node === undefined || node === null) throw new LiveCaptureError(variable, path);
		captured[variable] = String(node);
	}
	return captured;
}

/** Options for executing a single live exchange. */
export interface RunExchangeOptions {
	/** Mock-server origin, no trailing slash (see resolveBaseUrl) */
	baseUrl: string;
	/** Client-minted session UUID sent as X-Demo-Session */
	sessionId: string;
	/** Bearer token injected as the Authorization header */
	token: string;
	/** The step's static http array; from/to/note come from the referenced twins */
	staticHttp: HttpMessage[];
}

/** Options for running a whole step's exchanges. */
export interface RunStepOptions {
	/** Mock-server origin, no trailing slash (see resolveBaseUrl) */
	baseUrl: string;
	/** Client-minted session UUID sent as X-Demo-Session */
	sessionId: string;
	/** Bearer token injected as the Authorization header */
	token: string;
}

/**
 * Executes one LiveExchangeSpec against the mock server. Never throws for
 * network/CORS/timeout failures -- those yield `ok: false` with an `error`
 * description and no response message. Placeholder resolution failures DO
 * throw (LivePlaceholderError) before anything goes over the wire. Any HTTP
 * response, including 4xx/5xx, is `ok: true` and render-ready.
 */
export async function runExchange(
	spec: LiveExchangeSpec,
	ctx: Record<string, string>,
	opts: RunExchangeOptions
): Promise<LiveExchangeResult> {
	const staticRequest = opts.staticHttp[spec.staticRequestIndex];
	const staticResponse = opts.staticHttp[spec.staticResponseIndex];

	const path = resolvePlaceholders(spec.path, ctx);
	const body = spec.body === undefined ? undefined : resolvePlaceholders(spec.body, ctx);
	const url = opts.baseUrl + path;

	// Authorization and X-Demo-Session are injected exactly once; any such
	// lines in the spec are dropped defensively (the contract says not to
	// list them). Both injected headers are rendered -- honest -- and the
	// diff layer excludes X-Demo-Session by prefix.
	const headerLines = [
		...spec.headers.filter((line) => !/^(authorization|x-demo-session)\s*:/i.test(line)),
		`Authorization: Bearer ${opts.token}`,
		`X-Demo-Session: ${opts.sessionId}`,
	];
	const fetchHeaders: Record<string, string> = {};
	for (const line of headerLines) {
		const separator = line.indexOf(':');
		if (separator === -1) continue;
		fetchHeaders[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
	}

	const note = spec.note ?? staticRequest?.note;
	const request: HttpMessage = {
		type: 'server',
		from: staticRequest?.from ?? '',
		to: staticRequest?.to ?? '',
		method: spec.method,
		url,
		headers: headerLines,
	};
	if (body !== undefined) request.body = body;
	if (note !== undefined) request.note = note;

	const started = Date.now();
	try {
		const res = await fetch(url, {
			method: spec.method,
			headers: fetchHeaders,
			body,
			signal: AbortSignal.timeout(EXCHANGE_TIMEOUT_MS),
		});
		const text = await res.text();
		const durationMs = Date.now() - started;

		const phrase = res.statusText || REASON_PHRASES[res.status] || '';
		// Only the two headers the static story shows; Date/CORS/connection
		// noise is dropped at capture time so the diff stays clean by
		// construction.
		const responseHeaders: string[] = [];
		const contentType = res.headers.get('content-type');
		if (contentType) responseHeaders.push(`Content-Type: ${contentType}`);
		const location = res.headers.get('location');
		if (location) responseHeaders.push(`Location: ${location}`);

		const response: HttpMessage = {
			type: 'server-response',
			from: staticResponse?.from ?? (staticRequest?.to ?? ''),
			to: staticResponse?.to ?? (staticRequest?.from ?? ''),
			status: phrase ? `${res.status} ${phrase}` : String(res.status),
			headers: responseHeaders,
		};
		if (text) {
			// Preserve the server's body text verbatim. The mock server already
			// emits the canonical 2-space form the static payloads use (including
			// inlined single-string schemas arrays); re-serializing here would
			// re-expand that formatting and make "byte-identical" bodies render
			// differently in the compare panel. The diff compares structurally,
			// so formatting never affects chips either way.
			response.body = text;
		}
		return { spec, request, response, durationMs, ok: true };
	} catch (error) {
		return { spec, request, durationMs: Date.now() - started, ok: false, error: describeFetchError(error) };
	}
}

function describeFetchError(error: unknown): string {
	if (error instanceof Error && error.name === 'TimeoutError') {
		return `Request timed out after ${EXCHANGE_TIMEOUT_MS / 1000}s`;
	}
	if (error instanceof Error && error.message) {
		return error.message;
	}
	return 'Network request failed';
}

/**
 * Runs all live exchanges for a step sequentially, merging captures after
 * each 2xx response so later exchanges can use earlier captures. Stops at the
 * first network failure (`ok: false`). Throws LivePlaceholderError when
 * `requires` names variables missing from the context (the session layer
 * auto-runs prerequisites before calling this; the throw is the backstop).
 * `ranPrerequisiteStepIds` is returned empty -- the session layer records it.
 */
export async function runStep(step: Step, ctx: Record<string, string>, opts: RunStepOptions): Promise<LiveStepResult> {
	const live = step.live;
	if (!live) throw new Error(`Step ${step.id} has no live spec`);

	const missing = (live.requires ?? []).filter((variable) => ctx[variable] === undefined);
	if (missing.length > 0) throw new LivePlaceholderError(missing);

	const runCtx: Record<string, string> = { ...ctx };
	const captured: Record<string, string> = {};
	const exchanges: LiveExchangeResult[] = [];
	for (const spec of live.exchanges) {
		const result = await runExchange(spec, runCtx, { ...opts, staticHttp: step.http });
		exchanges.push(result);
		if (!result.ok) break;
		// Captures apply only to 2xx responses; on 4xx/5xx the previously
		// captured values stay in the context.
		if (spec.capture && result.response) {
			const statusCode = Number.parseInt(result.response.status ?? '', 10);
			if (statusCode >= 200 && statusCode < 300) {
				const json: unknown = result.response.body === undefined ? undefined : JSON.parse(result.response.body);
				const values = captureFromJson(json, spec.capture);
				Object.assign(runCtx, values);
				Object.assign(captured, values);
			}
		}
	}
	return {
		stepId: step.id,
		exchanges,
		captured,
		ranPrerequisiteStepIds: [],
		at: new Date().toISOString(),
	};
}

/**
 * Probes `GET {baseUrl}/healthz` with a short timeout. Returns 'up' on any
 * 2xx, 'down' on everything else (non-2xx, network failure, timeout).
 */
export async function probeLiveBackend(baseUrl: string): Promise<'up' | 'down'> {
	try {
		const res = await fetch(`${baseUrl}/healthz`, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
		return res.ok ? 'up' : 'down';
	} catch {
		return 'down';
	}
}
