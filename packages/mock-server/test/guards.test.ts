// packages/mock-server/test/guards.test.ts

import { describe, expect, it } from 'vitest';
import { ORIGIN, authHeaders, authedReq, makeApp, newSession } from './helpers.js';

describe('bearer auth', () => {
	it('missing bearer returns 401 with WWW-Authenticate and scim error envelope', async () => {
		const { app } = makeApp();
		const res = await app.request('/scim/v2/Users', {
			headers: { 'X-Demo-Session': newSession(), Accept: 'application/scim+json' },
		});
		expect(res.status).toBe(401);
		expect(res.headers.get('WWW-Authenticate')).toBe('Bearer realm="scim"');
		const body = (await res.json()) as Record<string, any>;
		expect(body.schemas).toEqual(['urn:ietf:params:scim:api:messages:2.0:Error']);
		expect(body.status).toBe('401');
		expect(body.detail).toBe('Invalid or missing Bearer token');
		expect(body).not.toHaveProperty('scimType');
	});

	it('wrong bearer returns 401', async () => {
		const { app } = makeApp();
		const res = await app.request('/scim/v2/Users', {
			headers: { ...authHeaders(newSession()), Authorization: 'Bearer wrong_token' },
		});
		expect(res.status).toBe(401);
	});
});

describe('unguarded endpoints', () => {
	it('healthz requires no auth or session', async () => {
		const { app } = makeApp();
		const res = await app.request('/healthz');
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true, service: 'ssowhat-mock-server' });
	});

	it('ServiceProviderConfig returns patch supported and etag unsupported', async () => {
		const { app } = makeApp();
		const res = await authedReq(app, newSession(), '/scim/v2/ServiceProviderConfig');
		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Type')).toBe('application/scim+json');
		const body = (await res.json()) as Record<string, any>;
		expect(body.patch.supported).toBe(true);
		expect(body.etag.supported).toBe(false);
		expect(body.filter).toEqual({ supported: true, maxResults: 100 });
	});
});

describe('rate limits', () => {
	it('31st request in a minute per session returns 429 with Retry-After', async () => {
		const { app } = makeApp();
		const session = newSession();
		for (let i = 0; i < 30; i++) {
			const res = await authedReq(app, session, '/scim/v2/Users');
			expect(res.status).toBe(200);
		}
		const limited = await authedReq(app, session, '/scim/v2/Users');
		expect(limited.status).toBe(429);
		expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0);
		const body = (await limited.json()) as Record<string, any>;
		expect(body.status).toBe('429');
	});

	it('per-IP limit trips across different session uuids', async () => {
		const { app } = makeApp();
		const forwarded = { 'X-Forwarded-For': '203.0.113.9, 10.0.0.1' };
		for (let i = 0; i < 120; i++) {
			const res = await authedReq(app, newSession(), '/scim/v2/Users', { headers: forwarded });
			expect(res.status).toBe(200);
		}
		// 121st request from the same first-hop IP: session cycling does not help.
		const limited = await authedReq(app, newSession(), '/scim/v2/Users', { headers: forwarded });
		expect(limited.status).toBe(429);
		expect(limited.headers.get('Retry-After')).not.toBeNull();
	});
});

describe('body cap', () => {
	it('body over 64KB returns 413 scim envelope', async () => {
		const { app } = makeApp();
		const res = await authedReq(app, newSession(), '/scim/v2/Users', {
			method: 'POST',
			headers: { 'Content-Type': 'application/scim+json' },
			body: `{"schemas":["urn:ietf:params:scim:schemas:core:2.0:User"],"userName":"${'x'.repeat(65 * 1024)}"}`,
		});
		expect(res.status).toBe(413);
		expect(res.headers.get('Content-Type')).toBe('application/scim+json');
		const body = (await res.json()) as Record<string, any>;
		expect(body.schemas).toEqual(['urn:ietf:params:scim:api:messages:2.0:Error']);
		expect(body.status).toBe('413');
	});
});

describe('CORS', () => {
	it('CORS preflight allows X-Demo-Session header and exposes Location', async () => {
		const { app } = makeApp();
		const preflight = await app.request('/scim/v2/Users', {
			method: 'OPTIONS',
			headers: {
				Origin: ORIGIN,
				'Access-Control-Request-Method': 'POST',
				'Access-Control-Request-Headers': 'Authorization, Content-Type, X-Demo-Session',
			},
		});
		expect(preflight.status).toBe(204);
		expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
		expect(preflight.headers.get('Access-Control-Allow-Headers')).toContain('X-Demo-Session');
		expect(preflight.headers.get('Access-Control-Allow-Methods')).toContain('PATCH');
		// Expose-Headers rides on the actual response, not the preflight.
		const actual = await authedReq(app, newSession(), '/scim/v2/Users', {
			headers: { Origin: ORIGIN },
		});
		expect(actual.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
		expect(actual.headers.get('Access-Control-Expose-Headers')).toBe('Location');
	});

	it('disallowed origin gets no CORS allow headers', async () => {
		const { app } = makeApp();
		const res = await app.request('/healthz', {
			headers: { Origin: 'https://evil.example' },
		});
		expect(res.status).toBe(200);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
	});
});
