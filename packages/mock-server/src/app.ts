// packages/mock-server/src/app.ts

import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { BODY_LIMIT_BYTES } from './config.js';
import { bearerAuth } from './middleware/auth.js';
import { rateLimit } from './middleware/rate-limit.js';
import { demoSession, type SessionVariables } from './middleware/session.js';
import { scimError, scimResponse } from './scim/serialize.js';
import { serviceProviderConfig } from './scim/service-provider-config.js';
import { SessionStore } from './scim/store.js';
import { registerUserRoutes } from './scim/users.js';

/** Hono environment for the mock-server app. */
export type AppEnv = { Variables: SessionVariables };

/** Options for the pure app factory. */
export interface CreateAppOptions {
	/** Origin used verbatim in Location headers and meta.location values. */
	publicBaseUrl: string;
	/** CORS origin allowlist. */
	allowedOrigins: string[];
	/** Injectable clock; defaults to the real time. Tests inject a fake one. */
	now?: () => Date;
	/** Injectable session store; the server entry passes its own so it can run the eviction sweep. */
	store?: SessionStore;
}

/**
 * Builds the mock-server Hono app. Pure factory: no listener, no timers --
 * portable to any fetch-based runtime (Node via @hono/node-server, Workers).
 * Periodic session eviction is the entrypoint's job (see server.ts); the
 * store also evicts opportunistically on every access.
 */
export function createApp(options: CreateAppOptions): Hono<AppEnv> {
	const { publicBaseUrl, allowedOrigins, now = () => new Date(), store = new SessionStore() } = options;
	const app = new Hono<AppEnv>();

	// Middleware order (LEAD-DECISIONS): CORS -> body-limit -> rate-limit ->
	// session -> auth -> route. Instances are created once and shared so the
	// rate limiter counts across every guarded route.
	const limitBody = bodyLimit({
		maxSize: BODY_LIMIT_BYTES,
		onError: () => scimError(413, `Request body exceeds the ${BODY_LIMIT_BYTES / 1024} KB demo limit`),
	});
	const limitRate = rateLimit({ now });
	const requireSession = demoSession({ store, now });

	app.use(
		'*',
		cors({
			origin: allowedOrigins,
			allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-Demo-Session'],
			exposeHeaders: ['Location'],
			maxAge: 86400,
			credentials: false,
		}),
	);

	// Client probe target: outside every guard except CORS.
	app.get('/healthz', (c) => c.json({ ok: true, service: 'ssowhat-mock-server' }));

	app.use('/scim/v2/*', limitBody);
	app.use('/scim/v2/*', limitRate);
	app.use('/scim/v2/*', requireSession);
	app.use('/scim/v2/*', bearerAuth());

	app.get('/scim/v2/ServiceProviderConfig', () => scimResponse(serviceProviderConfig(), 200));
	registerUserRoutes(app, { publicBaseUrl, now });

	// Demo control endpoint, not SCIM: valid session header only (no bearer),
	// but body-capped and rate-limited like everything else.
	app.delete('/api/session', limitBody, limitRate, requireSession, (c) => {
		store.delete(c.get('sessionId'));
		return c.body(null, 204);
	});

	return app;
}
