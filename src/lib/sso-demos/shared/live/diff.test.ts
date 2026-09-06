// src/lib/sso-demos/shared/live/diff.test.ts

import { describe, expect, it } from 'vitest';
import type { HttpMessage } from '../../types.js';
import { INFO_ABBREVIATED_BODY, INFO_SESSION_STATE, diffExchange } from './diff.js';

const STATIC_ID = '8c1f9a2e-4b7d-4e3a-9c0d-2f5e8a716b43';
const LIVE_ID = '7e0d1c2b-3a49-4f58-8671-90a1b2c3d4e5';
const SESSION_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const AUTH_LINE = 'Authorization: Bearer ots_scim_tk_9f3a...redacted';

function userBody(id: string, origin: string, created: string): string {
	return JSON.stringify(
		{
			schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
			id,
			userName: 'alice@contoso.com',
			active: true,
			meta: {
				resourceType: 'User',
				created,
				lastModified: created,
				version: 'W/"1"',
				location: `${origin}/scim/v2/Users/${id}`,
			},
		},
		null,
		2
	);
}

function staticCreatePair(): { req: HttpMessage; res: HttpMessage } {
	return {
		req: {
			type: 'server',
			from: 'Okta',
			to: 'App',
			method: 'POST',
			url: 'https://secrets.example.com/scim/v2/Users',
			headers: [AUTH_LINE, 'Content-Type: application/scim+json', 'Accept: application/scim+json'],
			body: '{ "schemas": [...], "userName": "alice@contoso.com", ... }',
			expandedPayload: {
				label: 'Full SCIM User payload',
				content: '{\n  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],\n  "userName": "alice@contoso.com"\n}',
			},
		},
		res: {
			type: 'server-response',
			from: 'App',
			to: 'Okta',
			status: '201 Created',
			headers: [
				'Content-Type: application/scim+json',
				`Location: https://secrets.example.com/scim/v2/Users/${STATIC_ID}`,
			],
			body: '{ "schemas": [...], "id": "8c1f9a2e-...", ... }',
			expandedPayload: {
				label: 'Created resource',
				content: userBody(STATIC_ID, 'https://secrets.example.com', '2024-01-15T10:31:02Z'),
			},
		},
	};
}

function liveCreatePair(): { req: HttpMessage; res: HttpMessage } {
	return {
		req: {
			type: 'server',
			from: 'Okta',
			to: 'App',
			method: 'POST',
			url: 'http://localhost:8787/scim/v2/Users',
			headers: [
				'Content-Type: application/scim+json',
				'Accept: application/scim+json',
				AUTH_LINE,
				`X-Demo-Session: ${SESSION_ID}`,
			],
			body: '{\n  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],\n  "userName": "alice@contoso.com"\n}',
		},
		res: {
			type: 'server-response',
			from: 'App',
			to: 'Okta',
			status: '201 Created',
			headers: ['Content-Type: application/scim+json', `Location: http://localhost:8787/scim/v2/Users/${LIVE_ID}`],
			body: userBody(LIVE_ID, 'http://localhost:8787', '2026-07-21T09:00:00Z'),
		},
	};
}

describe('diffExchange', () => {
	it('classifies allowlisted server-minted differences as expected chips', () => {
		const staticPair = staticCreatePair();
		const livePair = liveCreatePair();
		const diff = diffExchange(staticPair.req, staticPair.res, livePair.req, livePair.res);

		const expectedPaths = diff.chips.filter((chip) => chip.kind === 'expected').map((chip) => chip.path);
		expect(expectedPaths).toEqual(
			expect.arrayContaining(['id', 'meta.created', 'meta.lastModified', 'meta.location', 'Location'])
		);
		expect(diff.chips.filter((chip) => chip.kind === 'unexpected')).toEqual([]);
		expect(diff.identical).toBe(false);
	});

	it('classifies a non-allowlisted difference as an unexpected chip', () => {
		const staticPair = staticCreatePair();
		const livePair = liveCreatePair();
		// Live server drifted: it normalized the userName
		livePair.res.body = livePair.res.body!.replace('"userName": "alice@contoso.com"', '"userName": "ALICE@CONTOSO.COM"');
		const diff = diffExchange(staticPair.req, staticPair.res, livePair.req, livePair.res);
		expect(diff.chips).toContainEqual({ path: 'userName', kind: 'unexpected' });
	});

	it('treats a resource id in the url path as an expected difference', () => {
		const staticPair = staticCreatePair();
		const livePair = liveCreatePair();
		staticPair.req.method = 'PUT';
		staticPair.req.url = `https://secrets.example.com/scim/v2/Users/${STATIC_ID}`;
		livePair.req.method = 'PUT';
		livePair.req.url = `http://localhost:8787/scim/v2/Users/${LIVE_ID}`;
		const diff = diffExchange(staticPair.req, staticPair.res, livePair.req, livePair.res);
		expect(diff.chips).toContainEqual({ path: 'id', kind: 'expected' });
		expect(diff.chips.filter((chip) => chip.path === 'url')).toEqual([]);
	});

	it('compares the step-2 empty ListResponse as identical', () => {
		const listBody =
			'{\n  "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],\n  "totalResults": 0,\n  "startIndex": 1,\n  "itemsPerPage": 0,\n  "Resources": []\n}';
		const staticReq: HttpMessage = {
			type: 'server',
			from: 'Okta',
			to: 'App',
			method: 'GET',
			url: 'https://secrets.example.com/scim/v2/Users?filter=userName%20eq%20%22alice%40contoso.com%22&startIndex=1&count=100',
			headers: [AUTH_LINE, 'Accept: application/scim+json'],
		};
		const staticRes: HttpMessage = {
			type: 'server-response',
			from: 'App',
			to: 'Okta',
			status: '200 OK',
			headers: ['Content-Type: application/scim+json'],
			body: listBody,
		};
		const liveReq: HttpMessage = {
			...staticReq,
			url: 'http://localhost:8787/scim/v2/Users?filter=userName%20eq%20%22alice%40contoso.com%22&startIndex=1&count=100',
			headers: ['Accept: application/scim+json', AUTH_LINE, `X-Demo-Session: ${SESSION_ID}`],
		};
		// Live body is the executor's canonical re-serialization: structurally
		// identical, so the diff is empty -- the lesson itself.
		const liveRes: HttpMessage = { ...staticRes, body: JSON.stringify(JSON.parse(listBody), null, 2) };

		const diff = diffExchange(staticReq, staticRes, liveReq, liveRes);
		expect(diff.chips).toEqual([]);
		expect(diff.identical).toBe(true);
	});

	it('degrades an abbreviated static body to an info chip without body comparison', () => {
		const staticPair = staticCreatePair();
		const livePair = liveCreatePair();
		// Steps 5/7 style: abbreviated display body, no expandedPayload
		staticPair.res.body = '{ "schemas": [...], "id": "8c1f9a2e-...", "meta": { "version": "W/\\"2\\"", ... }, ... }';
		delete staticPair.res.expandedPayload;
		const diff = diffExchange(staticPair.req, staticPair.res, livePair.req, livePair.res);
		expect(diff.chips).toContainEqual({ path: INFO_ABBREVIATED_BODY, kind: 'info' });
		// No body-derived chips: comparison degraded to status/headers/method/url
		expect(diff.chips.filter((chip) => chip.path.startsWith('meta.'))).toEqual([]);
		expect(diff.identical).toBe(false);
	});

	it('normalizes url origins before compare', () => {
		const staticPair = staticCreatePair();
		const livePair = liveCreatePair();
		const diff = diffExchange(staticPair.req, staticPair.res, livePair.req, livePair.res);
		// Same path/query on both sides; only the origin differs -- no chip
		expect(diff.chips.filter((chip) => chip.path === 'url' || chip.path === 'origin')).toEqual([]);
	});

	it('excludes the X-Demo-Session header from the diff', () => {
		const staticPair = staticCreatePair();
		const livePair = liveCreatePair();
		const diff = diffExchange(staticPair.req, staticPair.res, livePair.req, livePair.res);
		expect(diff.chips.filter((chip) => chip.path.toLowerCase().includes('x-demo-session'))).toEqual([]);
	});

	it('labels a non-empty live ListResponse against the empty static one as session state, not drift', () => {
		// Rehire replay: step 2 re-run after step 3 created Alice in this live
		// session. The non-empty list is correct session state -- one info chip
		// instead of amber totalResults/itemsPerPage/Resources drift.
		const emptyList =
			'{\n  "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],\n  "totalResults": 0,\n  "startIndex": 1,\n  "itemsPerPage": 0,\n  "Resources": []\n}';
		const staticReq: HttpMessage = {
			type: 'server',
			from: 'Okta',
			to: 'App',
			method: 'GET',
			url: 'https://secrets.example.com/scim/v2/Users?filter=userName%20eq%20%22alice%40contoso.com%22',
			headers: [AUTH_LINE, 'Accept: application/scim+json'],
		};
		const staticRes: HttpMessage = {
			type: 'server-response',
			from: 'App',
			to: 'Okta',
			status: '200 OK',
			headers: ['Content-Type: application/scim+json'],
			body: emptyList,
		};
		const liveReq: HttpMessage = { ...staticReq, url: 'http://localhost:8787/scim/v2/Users?filter=userName%20eq%20%22alice%40contoso.com%22' };
		const liveRes: HttpMessage = {
			...staticRes,
			body: JSON.stringify(
				{
					schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
					totalResults: 1,
					startIndex: 1,
					itemsPerPage: 1,
					Resources: [JSON.parse(userBody(LIVE_ID, 'http://localhost:8787', '2026-07-21T19:00:00Z'))],
				},
				null,
				2
			),
		};

		const diff = diffExchange(staticReq, staticRes, liveReq, liveRes);
		expect(diff.chips).toContainEqual({ path: INFO_SESSION_STATE, kind: 'info' });
		expect(diff.chips.filter((chip) => chip.kind === 'unexpected')).toEqual([]);
		expect(diff.identical).toBe(false);
	});
});
