// src/lib/sso-demos/shared/live/diff.ts

// Pure-TS static-versus-live diff: field-level chips, no line-diff engine.
// The permitted differences are a closed allowlist (server-minted values);
// everything else that differs is a mock-server bug and is flagged amber.

import type { HttpMessage } from '../../types.js';

/** Classification of one differing field. */
export type DiffChipKind = 'expected' | 'unexpected' | 'info';

/** One chip in the diff strip: a dot-path (or header name) plus its kind. */
export interface DiffChip {
	/** Dot-path of the differing field, header name, or info-chip text */
	path: string;
	/** expected = allowlisted server-minted value; unexpected = contract drift; info = advisory */
	kind: DiffChipKind;
}

/** Diff result for one static/live exchange pair. */
export interface ExchangeDiff {
	/** Chips for every classified difference, in discovery order */
	chips: DiffChip[];
	/** True when nothing differs after normalization (step 2's empty ListResponse) */
	identical: boolean;
}

/** Info-chip text for static bodies that are abbreviated display strings, not JSON. */
export const INFO_ABBREVIATED_BODY = 'static body abbreviated — full body shown live only';

/**
 * Info-chip text for the rehire replay: re-running the filter step after the
 * user was created in the same live session correctly returns a non-empty
 * ListResponse. That is session state, not mock-server contract drift.
 */
export const INFO_SESSION_STATE =
	'user already exists in this live session — rehire path; use New session for the empty result';

const LIST_RESPONSE_URN = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';

// Allowlist of expected static<->live differences in JSON bodies: the values
// only a real server can mint. Everything else must byte-match.
const EXPECTED_BODY_PATHS = new Set(['id', 'meta.created', 'meta.lastModified', 'meta.version', 'meta.location']);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Compares a static request/response pair against its live twin and returns
 * field-level chips. Normalization before compare: URL origins are stripped
 * (origin difference alone produces no chip), `X-Demo-Session` header lines
 * are dropped from the live request, and the static canonical body is
 * `expandedPayload.content ?? body`. When the static body is not parseable
 * JSON (abbreviated display bodies), body comparison degrades to
 * status+headers+method+url with an info chip.
 */
export function diffExchange(
	staticReq: HttpMessage,
	staticRes: HttpMessage,
	liveReq: HttpMessage,
	liveRes: HttpMessage
): ExchangeDiff {
	const chips: DiffChip[] = [];
	const add = (path: string, kind: DiffChipKind) => {
		if (!chips.some((chip) => chip.path === path && chip.kind === kind)) chips.push({ path, kind });
	};

	// Request line
	if ((staticReq.method ?? '') !== (liveReq.method ?? '')) add('method', 'unexpected');
	compareUrls(staticReq.url, liveReq.url, add);

	// Request headers/body
	compareHeaders(staticReq.headers, liveReq.headers, add);
	compareBodies(canonicalBody(staticReq), liveReq.body, add);

	// Response status/headers/body
	if ((staticRes.status ?? '') !== (liveRes.status ?? '')) add('status', 'unexpected');
	compareHeaders(staticRes.headers, liveRes.headers, add);
	compareBodies(canonicalBody(staticRes), liveRes.body, add);

	return { chips, identical: chips.length === 0 };
}

/** Static canonical body: the full expanded payload when present, else the display body. */
function canonicalBody(message: HttpMessage): string | undefined {
	return message.expandedPayload?.content ?? message.body;
}

function stripOrigin(url: string): string {
	return url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, '');
}

function compareUrls(staticUrl: string | undefined, liveUrl: string | undefined, add: AddChip): void {
	const a = stripOrigin(staticUrl ?? '');
	const b = stripOrigin(liveUrl ?? '');
	if (a === b) return;
	// A path that differs only in UUID segments is the server-owned resource
	// id showing through -- allowlisted. Anything else is drift.
	if (differsOnlyInUuidSegments(a, b)) add('id', 'expected');
	else add('url', 'unexpected');
}

function differsOnlyInUuidSegments(a: string, b: string): boolean {
	const aSegments = a.split('/');
	const bSegments = b.split('/');
	if (aSegments.length !== bSegments.length) return false;
	return aSegments.every((segment, i) => {
		const other = bSegments[i];
		return segment === other || (UUID_RE.test(segment) && UUID_RE.test(other));
	});
}

type AddChip = (path: string, kind: DiffChipKind) => void;

interface ParsedHeader {
	name: string;
	value: string;
}

function parseHeaderLines(lines: string[] | undefined): Map<string, ParsedHeader> {
	const parsed = new Map<string, ParsedHeader>();
	for (const line of lines ?? []) {
		const separator = line.indexOf(':');
		if (separator === -1) continue;
		const name = line.slice(0, separator).trim();
		const value = line.slice(separator + 1).trim();
		parsed.set(name.toLowerCase(), { name, value });
	}
	return parsed;
}

function compareHeaders(staticLines: string[] | undefined, liveLines: string[] | undefined, add: AddChip): void {
	const staticHeaders = parseHeaderLines(staticLines);
	const liveHeaders = parseHeaderLines(liveLines);
	// Live-only session header is excluded from the diff by contract.
	liveHeaders.delete('x-demo-session');

	for (const key of new Set([...staticHeaders.keys(), ...liveHeaders.keys()])) {
		const staticHeader = staticHeaders.get(key);
		const liveHeader = liveHeaders.get(key);
		const displayName = staticHeader?.name ?? liveHeader?.name ?? key;
		if (!staticHeader || !liveHeader) {
			// Presence mismatch is drift even for Location -- the allowlist
			// covers value differences, not a header going missing.
			add(displayName, 'unexpected');
			continue;
		}
		let a = staticHeader.value;
		let b = liveHeader.value;
		if (/^https?:\/\//i.test(a) && /^https?:\/\//i.test(b)) {
			a = stripOrigin(a);
			b = stripOrigin(b);
		}
		if (a !== b) add(displayName, key === 'location' ? 'expected' : 'unexpected');
	}
}

function compareBodies(staticBody: string | undefined, liveBody: string | undefined, add: AddChip): void {
	const hasStatic = staticBody !== undefined && staticBody !== '';
	const hasLive = liveBody !== undefined && liveBody !== '';
	if (!hasStatic && !hasLive) return;
	if (!hasStatic) {
		add('body', 'unexpected');
		return;
	}

	let staticJson: unknown;
	try {
		staticJson = JSON.parse(staticBody);
	} catch {
		// Abbreviated static display body (steps 5/7): do not synthesize a
		// full static body -- skip body comparison and say so.
		add(INFO_ABBREVIATED_BODY, 'info');
		return;
	}

	if (!hasLive) {
		add('body', 'unexpected');
		return;
	}
	let liveJson: unknown;
	try {
		liveJson = JSON.parse(liveBody);
	} catch {
		add('body', 'unexpected');
		return;
	}

	// Rehire replay: the static story expects an empty ListResponse, but the
	// user already exists in this live session, so the live list is non-empty.
	// Correct session state -- one info chip, not a wall of amber drift.
	if (isEmptyListResponse(staticJson) && isNonEmptyListResponse(liveJson)) {
		add(INFO_SESSION_STATE, 'info');
		return;
	}

	const paths: string[] = [];
	walkJsonDiff(staticJson, liveJson, '', paths);
	for (const path of paths) {
		add(path, EXPECTED_BODY_PATHS.has(path) ? 'expected' : 'unexpected');
	}
}

function isListResponse(value: unknown): value is { totalResults?: unknown } {
	if (value === null || typeof value !== 'object') return false;
	const schemas = (value as Record<string, unknown>).schemas;
	return Array.isArray(schemas) && schemas.includes(LIST_RESPONSE_URN);
}

function isEmptyListResponse(value: unknown): boolean {
	return isListResponse(value) && value.totalResults === 0;
}

function isNonEmptyListResponse(value: unknown): boolean {
	return isListResponse(value) && typeof value.totalResults === 'number' && value.totalResults > 0;
}

/** Recursive structural walk producing dot-paths of differing leaves. */
function walkJsonDiff(a: unknown, b: unknown, path: string, out: string[]): void {
	if (a === b) return;
	const aIsArray = Array.isArray(a);
	const bIsArray = Array.isArray(b);
	if (aIsArray && bIsArray) {
		const length = Math.max(a.length, b.length);
		for (let i = 0; i < length; i++) {
			const childPath = joinPath(path, String(i));
			if (i >= a.length || i >= b.length) out.push(childPath);
			else walkJsonDiff(a[i], b[i], childPath, out);
		}
		return;
	}
	const aIsObject = !aIsArray && a !== null && typeof a === 'object';
	const bIsObject = !bIsArray && b !== null && typeof b === 'object';
	if (aIsObject && bIsObject) {
		const aRecord = a as Record<string, unknown>;
		const bRecord = b as Record<string, unknown>;
		for (const key of new Set([...Object.keys(aRecord), ...Object.keys(bRecord)])) {
			const childPath = joinPath(path, key);
			if (!(key in aRecord) || !(key in bRecord)) out.push(childPath);
			else walkJsonDiff(aRecord[key], bRecord[key], childPath, out);
		}
		return;
	}
	out.push(path || '(root)');
}

function joinPath(parent: string, segment: string): string {
	return parent ? `${parent}.${segment}` : segment;
}
