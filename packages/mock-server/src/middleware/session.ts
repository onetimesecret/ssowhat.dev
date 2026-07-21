// packages/mock-server/src/middleware/session.ts

import type { MiddlewareHandler } from 'hono';
import { scimError } from '../scim/serialize.js';
import type { Session, SessionStore } from '../scim/store.js';

/** Hono context variables set by the session middleware. */
export interface SessionVariables {
	/** The validated X-Demo-Session UUID. */
	sessionId: string;
	/** The (lazily created) session state for this request. */
	session: Session;
}

/** UUID v4 only -- the version nibble (4) and variant nibble ([89ab]) are enforced. */
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates the client-minted `X-Demo-Session` header (UUID v4) and lazily
 * creates/refreshes the session, exposing it as context variables. Missing
 * or malformed header gets a 400 SCIM Error envelope (no scimType).
 */
export function demoSession(options: {
	store: SessionStore;
	now: () => Date;
}): MiddlewareHandler<{ Variables: SessionVariables }> {
	return async (c, next) => {
		const id = c.req.header('x-demo-session');
		if (!id || !UUID_V4_RE.test(id)) {
			return scimError(400, 'X-Demo-Session header (UUID v4) required');
		}
		c.set('sessionId', id);
		c.set('session', options.store.touch(id, options.now().getTime()));
		await next();
	};
}
