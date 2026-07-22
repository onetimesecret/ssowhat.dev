// packages/mock-server/src/middleware/auth.ts

import type { MiddlewareHandler } from 'hono';
import { DEMO_TOKEN } from '../config.js';
import { scimError } from '../scim/serialize.js';

/**
 * Bearer-token guard for /scim/v2/*. Missing or wrong token gets a 401
 * SCIM Error envelope plus `WWW-Authenticate: Bearer realm="scim"`.
 * Plain string equality is deliberate (see DEMO_TOKEN in config.ts): the
 * token is public teaching material and gates nothing of value.
 */
export function bearerAuth(): MiddlewareHandler {
	const expected = `Bearer ${DEMO_TOKEN}`;
	return async (c, next) => {
		if (c.req.header('authorization') !== expected) {
			return scimError(401, 'Invalid or missing Bearer token', {
				headers: { 'WWW-Authenticate': 'Bearer realm="scim"' },
			});
		}
		await next();
	};
}
