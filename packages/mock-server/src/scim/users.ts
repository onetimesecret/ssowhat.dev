// packages/mock-server/src/scim/users.ts

import type { Hono } from 'hono';
import { MAX_USERS_PER_SESSION, PATCH_OP_SCHEMA, USER_SCHEMA } from '../config.js';
import type { SessionVariables } from '../middleware/session.js';
import { FILTER_DETAIL, parseFilter } from './filter.js';
import {
	listResponse,
	scimError,
	scimResponse,
	toScimTimestamp,
	userLocation,
	userResource,
} from './serialize.js';
import type { Session, StoredUser } from './store.js';

/** Context handed to the route registrar by the app factory. */
export interface ScimRouteContext {
	/** Origin used verbatim in Location headers and meta.location values. */
	publicBaseUrl: string;
	/** Injectable clock. */
	now: () => Date;
}

type ScimEnv = { Variables: SessionVariables };

const PATCH_SUPPORT_DETAIL =
	'Only replace operations with no path (object value) or path "active" are supported';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parses the request body as JSON; undefined on malformed input. */
async function readJson(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
	try {
		return await c.req.json();
	} catch {
		return undefined;
	}
}

function hasSchema(body: Record<string, unknown>, urn: string): boolean {
	return Array.isArray(body.schemas) && body.schemas.includes(urn);
}

/**
 * Extracts the client-writable attributes from a request body. Everything
 * server-owned or forbidden -- id, meta, schemas, password -- is stripped
 * by construction: it is simply never read. PUT semantics (absent means
 * cleared) fall out of the partial shape.
 */
function writableAttributes(body: Record<string, unknown>): Partial<StoredUser> {
	const attrs: Partial<StoredUser> = {};
	if (typeof body.externalId === 'string') attrs.externalId = body.externalId;
	if (typeof body.userName === 'string' && body.userName !== '') attrs.userName = body.userName;
	if (isRecord(body.name)) attrs.name = body.name;
	if (typeof body.displayName === 'string') attrs.displayName = body.displayName;
	if (Array.isArray(body.emails)) attrs.emails = body.emails;
	if (typeof body.active === 'boolean') attrs.active = body.active;
	return attrs;
}

/** Case-insensitive userName lookup (RFC 7643: userName is caseExact=false). */
function findByUserName(session: Session, userName: string): StoredUser | undefined {
	const wanted = userName.toLowerCase();
	for (const user of session.users.values()) {
		if (user.userName.toLowerCase() === wanted) return user;
	}
	return undefined;
}

/** Boolean coercion for PATCH path "active": booleans pass; "true"/"false" strings (Okta quirk) coerce. */
function coerceBoolean(value: unknown): boolean | undefined {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		const lower = value.toLowerCase();
		if (lower === 'true') return true;
		if (lower === 'false') return false;
	}
	return undefined;
}

function notFound(id: string): Response {
	return scimError(404, `Resource ${id} not found`);
}

/**
 * Registers the /scim/v2/Users routes on the app. All handlers run behind
 * the CORS -> body-limit -> rate-limit -> session -> auth middleware chain
 * installed by the app factory.
 */
export function registerUserRoutes(app: Hono<ScimEnv>, ctx: ScimRouteContext): void {
	app.get('/scim/v2/Users', (c) => {
		const session = c.get('session');
		const rawFilter = c.req.query('filter');
		let users = [...session.users.values()];
		if (rawFilter !== undefined) {
			const parsed = parseFilter(rawFilter);
			if (!parsed) return scimError(400, FILTER_DETAIL, { scimType: 'invalidFilter' });
			users = users.filter((user) => user.userName.toLowerCase() === parsed.value.toLowerCase());
		}
		// startIndex/count are accepted and startIndex echoed; the <=20-user
		// store never actually paginates, so itemsPerPage = resources returned.
		const startIndexRaw = c.req.query('startIndex');
		const startIndex =
			startIndexRaw !== undefined && /^\d+$/.test(startIndexRaw) ? Number.parseInt(startIndexRaw, 10) : 1;
		return scimResponse(listResponse(users, startIndex, ctx.publicBaseUrl), 200);
	});

	app.post('/scim/v2/Users', async (c) => {
		const body = await readJson(c);
		if (!isRecord(body)) {
			return scimError(400, 'Request body must be a JSON object', { scimType: 'invalidValue' });
		}
		if (!hasSchema(body, USER_SCHEMA)) {
			return scimError(400, `schemas must include ${USER_SCHEMA}`, { scimType: 'invalidValue' });
		}
		const attrs = writableAttributes(body);
		if (attrs.userName === undefined) {
			return scimError(400, 'userName is required', { scimType: 'invalidValue' });
		}
		const session = c.get('session');
		if (findByUserName(session, attrs.userName)) {
			return scimError(409, `userName ${attrs.userName} already exists`, { scimType: 'uniqueness' });
		}
		if (session.users.size >= MAX_USERS_PER_SESSION) {
			return scimError(409, 'Demo session user limit reached; reset the session');
		}
		const now = toScimTimestamp(ctx.now());
		const user: StoredUser = {
			...attrs,
			id: crypto.randomUUID(),
			userName: attrs.userName,
			active: attrs.active ?? true,
			created: now,
			lastModified: now,
			version: 1,
		};
		session.users.set(user.id, user);
		return scimResponse(userResource(user, ctx.publicBaseUrl), 201, {
			Location: userLocation(user.id, ctx.publicBaseUrl),
		});
	});

	app.get('/scim/v2/Users/:id', (c) => {
		const id = c.req.param('id');
		const user = c.get('session').users.get(id);
		if (!user) return notFound(id);
		return scimResponse(userResource(user, ctx.publicBaseUrl), 200);
	});

	app.put('/scim/v2/Users/:id', async (c) => {
		const id = c.req.param('id');
		const session = c.get('session');
		const existing = session.users.get(id);
		if (!existing) return notFound(id);
		const body = await readJson(c);
		if (!isRecord(body)) {
			return scimError(400, 'Request body must be a JSON object', { scimType: 'invalidValue' });
		}
		// Body id/meta are readOnly and ignored -- the path id is authoritative.
		const attrs = writableAttributes(body);
		if (attrs.userName === undefined) {
			return scimError(400, 'userName is required', { scimType: 'invalidValue' });
		}
		const conflict = findByUserName(session, attrs.userName);
		if (conflict && conflict.id !== id) {
			return scimError(409, `userName ${attrs.userName} already exists`, { scimType: 'uniqueness' });
		}
		// Full replace: attributes absent from the body are cleared; the
		// server-owned meta.created is preserved and the version advances.
		const replaced: StoredUser = {
			id: existing.id,
			externalId: attrs.externalId,
			userName: attrs.userName,
			name: attrs.name,
			displayName: attrs.displayName,
			emails: attrs.emails,
			active: attrs.active,
			created: existing.created,
			lastModified: toScimTimestamp(ctx.now()),
			version: existing.version + 1,
		};
		session.users.set(id, replaced);
		return scimResponse(userResource(replaced, ctx.publicBaseUrl), 200);
	});

	app.patch('/scim/v2/Users/:id', async (c) => {
		const id = c.req.param('id');
		const session = c.get('session');
		const user = session.users.get(id);
		if (!user) return notFound(id);
		const body = await readJson(c);
		if (!isRecord(body)) {
			return scimError(400, 'Request body must be a JSON object', { scimType: 'invalidValue' });
		}
		if (!hasSchema(body, PATCH_OP_SCHEMA)) {
			return scimError(400, `schemas must include ${PATCH_OP_SCHEMA}`, { scimType: 'invalidValue' });
		}
		const operations = body.Operations;
		if (!Array.isArray(operations) || operations.length === 0) {
			return scimError(400, 'Operations must be a non-empty array', { scimType: 'invalidValue' });
		}
		const updates: Partial<StoredUser> = {};
		for (const operation of operations) {
			if (
				!isRecord(operation) ||
				typeof operation.op !== 'string' ||
				operation.op.toLowerCase() !== 'replace'
			) {
				return scimError(400, PATCH_SUPPORT_DETAIL, { scimType: 'invalidPath' });
			}
			const path = operation.path;
			if (path === undefined || path === null) {
				// No path: the value object is applied against the resource
				// root (RFC 7644 §3.5.2.3) -- Okta's deactivation shape.
				if (!isRecord(operation.value)) {
					return scimError(400, PATCH_SUPPORT_DETAIL, { scimType: 'invalidPath' });
				}
				Object.assign(updates, writableAttributes(operation.value));
			} else if (typeof path === 'string' && path.toLowerCase() === 'active') {
				const value = coerceBoolean(operation.value);
				if (value === undefined) {
					return scimError(400, 'active must be a boolean', { scimType: 'invalidValue' });
				}
				updates.active = value;
			} else {
				return scimError(400, PATCH_SUPPORT_DETAIL, { scimType: 'invalidPath' });
			}
		}
		if (updates.userName !== undefined) {
			const conflict = findByUserName(session, updates.userName);
			if (conflict && conflict.id !== id) {
				return scimError(409, `userName ${updates.userName} already exists`, { scimType: 'uniqueness' });
			}
		}
		// Idempotent-safe by design: re-applying the same PATCH is a 200,
		// and the version still increments (one bump per successful request).
		Object.assign(user, updates);
		user.lastModified = toScimTimestamp(ctx.now());
		user.version += 1;
		return scimResponse(userResource(user, ctx.publicBaseUrl), 200);
	});

	app.delete('/scim/v2/Users/:id', (c) => {
		const id = c.req.param('id');
		if (!c.get('session').users.delete(id)) return notFound(id);
		return c.body(null, 204);
	});
}
