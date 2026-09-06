// src/lib/sso-demos/shared/live/executor.test.ts

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HttpMessage, LiveExchangeSpec, Step } from '../../types.js';
import {
	LiveCaptureError,
	LivePlaceholderError,
	captureFromJson,
	probeLiveBackend,
	resolvePlaceholders,
	runExchange,
	runStep,
} from './executor.js';

const SESSION_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const TOKEN = 'ots_scim_tk_9f3a...redacted';

const STATIC_HTTP: HttpMessage[] = [
	{
		type: 'server',
		from: 'Okta',
		to: 'App',
		method: 'POST',
		url: 'https://secrets.example.com/scim/v2/Users',
		headers: [`Authorization: Bearer ${TOKEN}`, 'Content-Type: application/scim+json'],
		note: 'static request note',
	},
	{
		type: 'server-response',
		from: 'App',
		to: 'Okta',
		status: '201 Created',
		headers: ['Content-Type: application/scim+json'],
	},
];

const SPEC: LiveExchangeSpec = {
	staticRequestIndex: 0,
	staticResponseIndex: 1,
	method: 'POST',
	path: '/scim/v2/Users',
	headers: ['Content-Type: application/scim+json', 'Accept: application/scim+json'],
	body: '{\n  "userName": "alice@contoso.com"\n}',
};

const OPTS = { baseUrl: 'http://localhost:8787', sessionId: SESSION_ID, token: TOKEN, staticHttp: STATIC_HTTP };

function stubFetchResponse(response: Response) {
	const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => response);
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('resolvePlaceholders', () => {
	it('substitutes {{userId}} in path and body', () => {
		const ctx = { userId: 'abc-123' };
		expect(resolvePlaceholders('/scim/v2/Users/{{userId}}', ctx)).toBe('/scim/v2/Users/abc-123');
		expect(resolvePlaceholders('{\n  "id": "{{userId}}"\n}', ctx)).toBe('{\n  "id": "abc-123"\n}');
	});

	it('throws LivePlaceholderError naming unresolved variables', () => {
		expect(() => resolvePlaceholders('/Users/{{userId}}/{{version}}', {})).toThrowError(LivePlaceholderError);
		try {
			resolvePlaceholders('/Users/{{userId}}/{{version}}', {});
			expect.unreachable('should have thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(LivePlaceholderError);
			expect((error as LivePlaceholderError).unresolved).toEqual(['userId', 'version']);
			expect((error as Error).message).toContain('userId');
			expect((error as Error).message).toContain('version');
		}
	});

	it('leaves JSON braces untouched', () => {
		const body = '{\n  "name": { "givenName": "Alice" },\n  "id": "{{userId}}"\n}';
		expect(resolvePlaceholders(body, { userId: 'x' })).toBe('{\n  "name": { "givenName": "Alice" },\n  "id": "x"\n}');
	});
});

describe('captureFromJson', () => {
	it('resolves top-level, nested dot-path, and numeric array segment', () => {
		const json = {
			id: 'top',
			meta: { version: 'W/"1"' },
			Resources: [{ id: 'first' }, { id: 'second' }],
		};
		expect(
			captureFromJson(json, { userId: 'id', version: 'meta.version', secondId: 'Resources.1.id' })
		).toEqual({ userId: 'top', version: 'W/"1"', secondId: 'second' });
	});

	it('throws LiveCaptureError on missing path', () => {
		expect(() => captureFromJson({ id: 'x' }, { userId: 'meta.location' })).toThrowError(LiveCaptureError);
	});
});

describe('runExchange', () => {
	it('injects Authorization and X-Demo-Session headers exactly once', async () => {
		const fetchMock = stubFetchResponse(
			new Response('{}', { status: 201, headers: { 'Content-Type': 'application/scim+json' } })
		);
		// A stale Authorization line in the spec must not produce a duplicate
		const spec = { ...SPEC, headers: ['Authorization: Bearer stale', ...SPEC.headers] };
		const result = await runExchange(spec, {}, OPTS);
		const authLines = (result.request.headers ?? []).filter((line) => line.startsWith('Authorization:'));
		const sessionLines = (result.request.headers ?? []).filter((line) => line.startsWith('X-Demo-Session:'));
		expect(authLines).toEqual([`Authorization: Bearer ${TOKEN}`]);
		expect(sessionLines).toEqual([`X-Demo-Session: ${SESSION_ID}`]);
		const init = fetchMock.mock.calls[0][1];
		expect(init?.headers).toMatchObject({ Authorization: `Bearer ${TOKEN}`, 'X-Demo-Session': SESSION_ID });
	});

	it('builds request HttpMessage with from/to/note copied from the static twin', async () => {
		stubFetchResponse(new Response('{}', { status: 201 }));
		const result = await runExchange(SPEC, {}, OPTS);
		expect(result.request.type).toBe('server');
		expect(result.request.from).toBe('Okta');
		expect(result.request.to).toBe('App');
		expect(result.request.note).toBe('static request note');
		expect(result.request.url).toBe('http://localhost:8787/scim/v2/Users');
	});

	it('formats response status as "201 Created" including reason phrase when statusText is empty', async () => {
		stubFetchResponse(new Response('{}', { status: 201 }));
		const result = await runExchange(SPEC, {}, OPTS);
		expect(result.response?.status).toBe('201 Created');
	});

	it('keeps only Content-Type and Location response headers', async () => {
		stubFetchResponse(
			new Response('{}', {
				status: 201,
				headers: {
					'Content-Type': 'application/scim+json',
					Location: 'http://localhost:8787/scim/v2/Users/abc',
					Date: 'Tue, 21 Jul 2026 10:00:00 GMT',
					'Access-Control-Allow-Origin': '*',
					'X-Powered-By': 'test',
				},
			})
		);
		const result = await runExchange(SPEC, {}, OPTS);
		expect(result.response?.headers).toEqual([
			'Content-Type: application/scim+json',
			'Location: http://localhost:8787/scim/v2/Users/abc',
		]);
	});

	it('preserves the response body text verbatim (the server already emits the canonical form)', async () => {
		// Re-serializing would re-expand the server's inlined schemas arrays and
		// break the byte-identity the compare panel shows for step 2.
		const canonical = '{\n  "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],\n  "totalResults": 0\n}';
		stubFetchResponse(new Response(canonical, { status: 200 }));
		const result = await runExchange(SPEC, {}, OPTS);
		expect(result.response?.body).toBe(canonical);
	});

	it('maps a 409 response to ok:true with a renderable server-response message', async () => {
		const envelope = '{"schemas":["urn:ietf:params:scim:api:messages:2.0:Error"],"status":"409"}';
		stubFetchResponse(new Response(envelope, { status: 409, headers: { 'Content-Type': 'application/scim+json' } }));
		const result = await runExchange(SPEC, {}, OPTS);
		expect(result.ok).toBe(true);
		expect(result.error).toBeUndefined();
		expect(result.response?.type).toBe('server-response');
		expect(result.response?.status).toBe('409 Conflict');
		expect(result.response?.body).toBe(envelope);
	});

	it('maps network failure to ok:false with error and no response message', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('fetch failed');
			})
		);
		const result = await runExchange(SPEC, {}, OPTS);
		expect(result.ok).toBe(false);
		expect(result.error).toBe('fetch failed');
		expect(result.response).toBeUndefined();
		expect(result.request.url).toBe('http://localhost:8787/scim/v2/Users');
	});

	it('maps timeout to ok:false', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
			})
		);
		const result = await runExchange(SPEC, {}, OPTS);
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/timed out/i);
		expect(result.response).toBeUndefined();
	});
});

describe('runStep', () => {
	function makeStep(exchanges: LiveExchangeSpec[], requires?: string[]): Step {
		const http: HttpMessage[] = [
			STATIC_HTTP[0],
			STATIC_HTTP[1],
			{
				type: 'server',
				from: 'Okta',
				to: 'App',
				method: 'GET',
				url: 'https://secrets.example.com/scim/v2/Users/8c1f9a2e-4b7d-4e3a-9c0d-2f5e8a716b43',
				headers: ['Accept: application/scim+json'],
			},
			{ type: 'server-response', from: 'App', to: 'Okta', status: '200 OK', headers: [] },
		];
		const live = requires === undefined ? { exchanges } : { exchanges, requires };
		return {
			id: 3,
			title: 'test step',
			userSees: 'x',
			urlBar: 'https://example.com',
			description: 'test',
			http,
			actors: {},
			live,
		};
	}

	it("merges captures sequentially so exchange 2 can use exchange 1's capture", async () => {
		const first: LiveExchangeSpec = { ...SPEC, capture: { userId: 'id' } };
		const second: LiveExchangeSpec = {
			staticRequestIndex: 2,
			staticResponseIndex: 3,
			method: 'GET',
			path: '/scim/v2/Users/{{userId}}',
			headers: ['Accept: application/scim+json'],
		};
		const responses = [
			new Response('{"id":"abc-123"}', { status: 201 }),
			new Response('{"id":"abc-123"}', { status: 200 }),
		];
		const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => {
			const next = responses.shift();
			if (!next) throw new Error('unexpected extra fetch');
			return next;
		});
		vi.stubGlobal('fetch', fetchMock);

		const result = await runStep(makeStep([first, second]), {}, OPTS);
		expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:8787/scim/v2/Users/abc-123');
		expect(result.captured).toEqual({ userId: 'abc-123' });
		expect(result.exchanges).toHaveLength(2);
		expect(result.stepId).toBe(3);
	});

	it('with unmet requires reports which variables are missing', async () => {
		const step = makeStep([SPEC], ['userId']);
		await expect(runStep(step, {}, OPTS)).rejects.toThrowError(LivePlaceholderError);
		await expect(runStep(step, {}, OPTS)).rejects.toThrowError(/userId/);
	});

	it('does not capture from a non-2xx response and keeps the prior context value', async () => {
		// LEAD decision 4: captures apply only to 2xx. A 409 Error envelope has
		// no `id`; a declared capture on it must neither throw nor clobber the
		// value captured by an earlier successful run.
		const withCapture: LiveExchangeSpec = { ...SPEC, capture: { userId: 'id' } };
		const envelope = '{"schemas":["urn:ietf:params:scim:api:messages:2.0:Error"],"status":"409"}';
		stubFetchResponse(new Response(envelope, { status: 409, headers: { 'Content-Type': 'application/scim+json' } }));
		const ctx = { userId: 'earlier-run-id' };
		const result = await runStep(makeStep([withCapture]), ctx, OPTS);
		expect(result.exchanges[0].ok).toBe(true);
		expect(result.captured).toEqual({});
		expect(ctx.userId).toBe('earlier-run-id');
	});
});

describe('probeLiveBackend', () => {
	it('returns down on non-200 and on timeout', async () => {
		stubFetchResponse(new Response('nope', { status: 500 }));
		await expect(probeLiveBackend('http://localhost:8787')).resolves.toBe('down');

		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
			})
		);
		await expect(probeLiveBackend('http://localhost:8787')).resolves.toBe('down');

		stubFetchResponse(new Response('{"ok":true}', { status: 200 }));
		await expect(probeLiveBackend('http://localhost:8787')).resolves.toBe('up');
	});
});
