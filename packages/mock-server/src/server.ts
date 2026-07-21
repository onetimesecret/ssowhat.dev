// packages/mock-server/src/server.ts

import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { DEFAULT_ALLOWED_ORIGINS, SWEEP_INTERVAL_MS } from './config.js';
import { SessionStore } from './scim/store.js';

const portRaw = Number.parseInt(process.env.PORT ?? '', 10);
const port = Number.isNaN(portRaw) ? 8787 : portRaw;
const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`;
const allowedOrigins = process.env.ALLOWED_ORIGINS
	? process.env.ALLOWED_ORIGINS.split(',')
			.map((origin) => origin.trim())
			.filter((origin) => origin !== '')
	: DEFAULT_ALLOWED_ORIGINS;

// Honor X-Forwarded-For only when the operator declares a trusted fronting
// proxy; the header is spoofable by direct clients.
const trustProxy = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY?.toLowerCase() === 'true';

const store = new SessionStore();
const app = createApp({ publicBaseUrl, allowedOrigins, store, trustProxy });

// The 5-minute expired-session sweep lives here, not in app.ts, so the app
// factory stays portable to timerless runtimes. unref() lets the process
// exit naturally.
setInterval(() => store.evictExpired(Date.now()), SWEEP_INTERVAL_MS).unref();

serve({ fetch: app.fetch, port }, (info) => {
	console.log(`[mock-server] listening on http://localhost:${info.port} (public base URL: ${publicBaseUrl})`);
	console.log(`[mock-server] allowed origins: ${allowedOrigins.join(', ')}`);
	console.log(
		'[mock-server] DEMO MOCK ONLY -- canned SCIM data, public throwaway token, in-memory per-session state. This server must never be trusted, hold real data, or be pointed at by anything real.',
	);
});
