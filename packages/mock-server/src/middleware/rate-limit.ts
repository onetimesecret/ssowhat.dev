// packages/mock-server/src/middleware/rate-limit.ts

import type { Context, MiddlewareHandler } from 'hono';
import { RATE_LIMIT_PER_IP, RATE_LIMIT_PER_SESSION, RATE_WINDOW_MS } from '../config.js';
import { scimError } from '../scim/serialize.js';

/**
 * Best-effort client address: first x-forwarded-for hop when behind a
 * proxy, the socket address under @hono/node-server (its bindings land on
 * c.env), 'local' for in-process test requests. Typed structurally so
 * app.ts stays free of Node-only imports.
 */
function clientIp(c: Context): string {
	const forwarded = c.req.header('x-forwarded-for');
	if (forwarded) {
		const firstHop = forwarded.split(',')[0].trim();
		if (firstHop) return firstHop;
	}
	const env = c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined;
	return env?.incoming?.socket?.remoteAddress ?? 'local';
}

/**
 * Fixed-window in-memory rate limiter: 120 req/min per IP (checked first --
 * cheaper, and it catches session-UUID cycling) and 30 req/min per session.
 * Windows are 60s aligned to the epoch; only the current window's counts
 * are kept, so memory stays bounded no matter how many session ids a
 * client cycles. Exceeding either limit gets a 429 SCIM Error envelope
 * with a Retry-After header pointing at the window end.
 */
export function rateLimit(options: { now: () => Date }): MiddlewareHandler {
	let windowId = -1;
	const counts = new Map<string, number>();

	const bump = (key: string): number => {
		const next = (counts.get(key) ?? 0) + 1;
		counts.set(key, next);
		return next;
	};

	return async (c, next) => {
		const nowMs = options.now().getTime();
		const currentWindow = Math.floor(nowMs / RATE_WINDOW_MS);
		if (currentWindow !== windowId) {
			windowId = currentWindow;
			counts.clear();
		}
		const retryAfter = String(Math.max(1, Math.ceil(((currentWindow + 1) * RATE_WINDOW_MS - nowMs) / 1000)));
		if (bump(`ip:${clientIp(c)}`) > RATE_LIMIT_PER_IP) {
			return scimError(429, 'Rate limit exceeded', { headers: { 'Retry-After': retryAfter } });
		}
		const sessionId = c.req.header('x-demo-session');
		if (sessionId && bump(`session:${sessionId}`) > RATE_LIMIT_PER_SESSION) {
			return scimError(429, 'Rate limit exceeded', { headers: { 'Retry-After': retryAfter } });
		}
		await next();
	};
}
