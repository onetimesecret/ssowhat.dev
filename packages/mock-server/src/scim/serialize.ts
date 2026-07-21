// packages/mock-server/src/scim/serialize.ts

import { ERROR_SCHEMA, LIST_RESPONSE_SCHEMA, USER_SCHEMA } from '../config.js';
import type { StoredUser } from './store.js';

/** Exact Content-Type for every SCIM response -- no charset suffix, so header lines byte-match the static traces. */
export const SCIM_CONTENT_TYPE = 'application/scim+json';

/**
 * Collapses a single-string "schemas" array onto one line, matching the
 * static expandedPayload layout (`"schemas": ["urn:..."],`). Quotes inside
 * serialized string values are escaped, so the pattern cannot match inside
 * user-supplied data; multi-element arrays stay expanded (none exist here).
 */
const INLINE_SCHEMAS_RE = /"schemas": \[\n\s*("[^"]+")\n\s*\]/g;

/**
 * Canonical SCIM JSON text: 2-space indent with schemas arrays inlined so
 * live bodies line up with the static fixtures and diffs stay value-level,
 * not layout-level.
 */
export function scimJson(value: unknown): string {
	return JSON.stringify(value, null, 2).replace(INLINE_SCHEMAS_RE, '"schemas": [$1]');
}

/** Second-precision UTC timestamp (matches the static `2024-01-15T10:31:02Z` format). */
export function toScimTimestamp(date: Date): string {
	return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Canonical resource location: publicBaseUrl used verbatim, no normalization. */
export function userLocation(id: string, publicBaseUrl: string): string {
	return `${publicBaseUrl}/scim/v2/Users/${id}`;
}

/**
 * Builds a User resource object in the canonical key order
 * `schemas, id, externalId, userName, name, displayName, emails, active, meta`
 * (JS objects preserve insertion order). Absent optional attributes are
 * omitted entirely; a password is never present by construction.
 */
export function userResource(user: StoredUser, publicBaseUrl: string): Record<string, unknown> {
	const resource: Record<string, unknown> = {
		schemas: [USER_SCHEMA],
		id: user.id,
	};
	if (user.externalId !== undefined) resource.externalId = user.externalId;
	resource.userName = user.userName;
	if (user.name !== undefined) resource.name = user.name;
	if (user.displayName !== undefined) resource.displayName = user.displayName;
	if (user.emails !== undefined) resource.emails = user.emails;
	if (user.active !== undefined) resource.active = user.active;
	resource.meta = {
		resourceType: 'User',
		created: user.created,
		lastModified: user.lastModified,
		version: `W/"${user.version}"`,
		location: userLocation(user.id, publicBaseUrl),
	};
	return resource;
}

/**
 * ListResponse envelope in the static key order. With no matches the
 * serialized form is byte-identical to the static step-2 body
 * (totalResults 0, startIndex echoed, itemsPerPage 0, Resources []).
 */
export function listResponse(
	users: StoredUser[],
	startIndex: number,
	publicBaseUrl: string,
): Record<string, unknown> {
	return {
		schemas: [LIST_RESPONSE_SCHEMA],
		totalResults: users.length,
		startIndex,
		itemsPerPage: users.length,
		Resources: users.map((user) => userResource(user, publicBaseUrl)),
	};
}

/** Wraps a payload as a SCIM response with the exact Content-Type. */
export function scimResponse(payload: unknown, status: number, headers?: Record<string, string>): Response {
	return new Response(scimJson(payload), {
		status,
		headers: { 'Content-Type': SCIM_CONTENT_TYPE, ...headers },
	});
}

/**
 * RFC 7644 §3.12 Error envelope. `status` is a JSON STRING by spec;
 * `scimType` appears only where the protocol defines one.
 */
export function scimError(
	status: number,
	detail: string,
	options: { scimType?: string; headers?: Record<string, string> } = {},
): Response {
	const envelope: Record<string, unknown> = {
		schemas: [ERROR_SCHEMA],
		status: String(status),
	};
	if (options.scimType !== undefined) envelope.scimType = options.scimType;
	envelope.detail = detail;
	return scimResponse(envelope, status, options.headers);
}
