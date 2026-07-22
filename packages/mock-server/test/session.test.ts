// packages/mock-server/test/session.test.ts

import { describe, expect, it } from 'vitest';
import { SessionStore } from '../src/scim/store.js';
import {
	FILTER_ALICE_PATH,
	authHeaders,
	authedReq,
	makeApp,
	minimalUserBody,
	newSession,
	seedAlice,
} from './helpers.js';

const JSON_HEADERS = { 'Content-Type': 'application/scim+json' };

describe('X-Demo-Session guard', () => {
	it('request without X-Demo-Session returns 400', async () => {
		const { app } = makeApp();
		const headers = authHeaders(newSession());
		delete headers['X-Demo-Session'];
		const res = await app.request('/scim/v2/Users', { headers });
		expect(res.status).toBe(400);
		const body = (await res.json()) as Record<string, any>;
		expect(body.status).toBe('400');
		expect(body.detail).toBe('X-Demo-Session header (UUID v4) required');
	});

	it('request with non-uuid X-Demo-Session returns 400', async () => {
		const { app } = makeApp();
		const res = await app.request('/scim/v2/Users', {
			headers: authHeaders('not-a-uuid'),
		});
		expect(res.status).toBe(400);
	});

	it('uuid v1 format is rejected (version nibble enforced)', async () => {
		const { app } = makeApp();
		// Valid UUID shape, but version nibble 1 (time-based v1), not 4.
		const res = await app.request('/scim/v2/Users', {
			headers: authHeaders('2c5ea4c0-4067-11e9-8bad-9b1deb4d3b7d'),
		});
		expect(res.status).toBe(400);
	});
});

describe('session isolation and lifecycle', () => {
	it("two sessions do not see each other's users", async () => {
		const { app } = makeApp();
		const sessionA = newSession();
		const sessionB = newSession();
		await seedAlice(app, sessionA);
		const inB = await authedReq(app, sessionB, '/scim/v2/Users');
		expect(((await inB.json()) as Record<string, any>).totalResults).toBe(0);
		const inA = await authedReq(app, sessionA, '/scim/v2/Users');
		expect(((await inA.json()) as Record<string, any>).totalResults).toBe(1);
	});

	it('DELETE /api/session empties the store so GET filter returns totalResults 0', async () => {
		const { app } = makeApp();
		const session = newSession();
		await seedAlice(app, session);
		// Session header only -- no bearer token on the control endpoint.
		const del = await app.request('/api/session', {
			method: 'DELETE',
			headers: { 'X-Demo-Session': session },
		});
		expect(del.status).toBe(204);
		const res = await authedReq(app, session, FILTER_ALICE_PATH);
		expect(((await res.json()) as Record<string, any>).totalResults).toBe(0);
	});

	it('session expires after 30min idle and lazily recreates empty (injected now())', async () => {
		const { app, advance } = makeApp();
		const session = newSession();
		await seedAlice(app, session);
		// 29 minutes idle: still alive (and this request slides the TTL).
		advance(29 * 60 * 1000);
		const alive = await authedReq(app, session, '/scim/v2/Users');
		expect(((await alive.json()) as Record<string, any>).totalResults).toBe(1);
		// 29 MORE minutes idle -- 58 minutes after creation. This is what
		// separates a sliding TTL from a fixed-from-creation one: the request
		// above slid the deadline, so the session must still be alive here.
		advance(29 * 60 * 1000);
		const slid = await authedReq(app, session, '/scim/v2/Users');
		expect(((await slid.json()) as Record<string, any>).totalResults).toBe(1);
		// 31 more minutes idle: expired; the next request lazily recreates empty.
		advance(31 * 60 * 1000);
		const expired = await authedReq(app, session, '/scim/v2/Users');
		expect(expired.status).toBe(200);
		expect(((await expired.json()) as Record<string, any>).totalResults).toBe(0);
	});

	it('LRU evicts oldest session past the 500 cap', () => {
		const store = new SessionStore();
		const now = Date.now();
		const ids = Array.from({ length: 500 }, (_, i) => `session-${i}`);
		for (const id of ids) store.touch(id, now);
		expect(store.size).toBe(500);
		// Touch the oldest so it moves to the back of the LRU order.
		store.touch('session-0', now);
		// A 501st session evicts the now-oldest (session-1), not session-0.
		store.touch('session-new', now);
		expect(store.size).toBe(500);
		expect(store.has('session-1')).toBe(false);
		expect(store.has('session-0')).toBe(true);
		expect(store.has('session-new')).toBe(true);
	});

	it('POST beyond 20-user session cap returns 409', async () => {
		const { app } = makeApp();
		const session = newSession();
		for (let i = 0; i < 20; i++) {
			const res = await authedReq(app, session, '/scim/v2/Users', {
				method: 'POST',
				headers: JSON_HEADERS,
				body: minimalUserBody(`user${i}@contoso.com`),
			});
			expect(res.status).toBe(201);
		}
		const overflow = await authedReq(app, session, '/scim/v2/Users', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: minimalUserBody('one-too-many@contoso.com'),
		});
		expect(overflow.status).toBe(409);
		const body = (await overflow.json()) as Record<string, any>;
		expect(body.status).toBe('409');
		expect(body.detail).toBe('Demo session user limit reached; reset the session');
	});
});
