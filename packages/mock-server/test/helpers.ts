// packages/mock-server/test/helpers.ts

import type { Hono } from 'hono';
import { createApp, type AppEnv } from '../src/app.js';
import { DEMO_TOKEN } from '../src/config.js';
import { SessionStore } from '../src/scim/store.js';

/** Public base URL injected into the test app (used verbatim in Location/meta.location). */
export const BASE_URL = 'https://scim-mock.test';

/** The one allowed CORS origin in tests (the repo's dev-server origin). */
export const ORIGIN = 'http://localhost:5184';

/** The static fixture id from steps.ts -- live ids must never equal it. */
export const STATIC_FIXTURE_ID = '8c1f9a2e-4b7d-4e3a-9c0d-2f5e8a716b43';

/** The static step-2 request path, query encoding verbatim from steps.ts. */
export const FILTER_ALICE_PATH =
	'/scim/v2/Users?filter=userName%20eq%20%22alice%40contoso.com%22&startIndex=1&count=100';

/** The static step-2 empty ListResponse body, byte-for-byte from steps.ts. */
export const STATIC_EMPTY_LIST =
	'{\n  "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],\n  "totalResults": 0,\n  "startIndex": 1,\n  "itemsPerPage": 0,\n  "Resources": []\n}';

/** The canonical step-3 POST /Users request body (static expandedPayload verbatim). */
export const CREATE_ALICE_BODY = `{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "alice@contoso.com",
  "name": {
    "givenName": "Alice",
    "familyName": "Smith"
  },
  "displayName": "Alice Smith",
  "emails": [
    {
      "value": "alice@contoso.com",
      "type": "work",
      "primary": true
    }
  ],
  "externalId": "00u1abcd2EFGHIJKL345",
  "active": true
}`;

/** The canonical step-5 PUT body (static expandedPayload with the captured id substituted). */
export function putNguyenBody(id: string): string {
	return `{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "${id}",
  "externalId": "00u1abcd2EFGHIJKL345",
  "userName": "alice@contoso.com",
  "name": {
    "givenName": "Alice",
    "familyName": "Nguyen"
  },
  "displayName": "Alice Nguyen",
  "emails": [
    {
      "value": "alice@contoso.com",
      "type": "work",
      "primary": true
    }
  ],
  "active": true
}`;
}

/** The canonical step-7 deactivation PatchOp (no path; value applied at the resource root). */
export const DEACTIVATE_BODY = `{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "replace",
      "value": {
        "active": false
      }
    }
  ]
}`;

/** A test app with an injectable clock and its backing store. */
export interface TestApp {
	app: Hono<AppEnv>;
	store: SessionStore;
	/** Advance the injected clock by ms. */
	advance: (ms: number) => void;
}

/** Fresh app + store + fake clock per test; no listener, no network. */
export function makeApp(): TestApp {
	let t = Date.parse('2026-01-15T10:31:02Z');
	const store = new SessionStore();
	const app = createApp({
		publicBaseUrl: BASE_URL,
		allowedOrigins: [ORIGIN],
		now: () => new Date(t),
		store,
	});
	return {
		app,
		store,
		advance: (ms) => {
			t += ms;
		},
	};
}

/** Mints a fresh client session UUID. */
export function newSession(): string {
	return crypto.randomUUID();
}

/** Headers for an authenticated SCIM request (valid bearer + session). */
export function authHeaders(session: string, extra: Record<string, string> = {}): Record<string, string> {
	return {
		Authorization: `Bearer ${DEMO_TOKEN}`,
		Accept: 'application/scim+json',
		'X-Demo-Session': session,
		...extra,
	};
}

/** In-process request with valid bearer + session headers pre-applied. */
export function authedReq(
	app: Hono<AppEnv>,
	session: string,
	path: string,
	init: RequestInit = {},
): Promise<Response> {
	return Promise.resolve(
		app.request(path, {
			...init,
			headers: { ...authHeaders(session), ...(init.headers as Record<string, string> | undefined) },
		}),
	);
}

/** POSTs the canonical create body; returns the parsed 201 resource. */
export async function seedAlice(
	app: Hono<AppEnv>,
	session: string,
): Promise<{ res: Response; body: Record<string, any>; id: string }> {
	const res = await authedReq(app, session, '/scim/v2/Users', {
		method: 'POST',
		headers: { 'Content-Type': 'application/scim+json' },
		body: CREATE_ALICE_BODY,
	});
	const body = (await res.json()) as Record<string, any>;
	return { res, body, id: body.id as string };
}

/** Minimal valid POST body for cap/uniqueness tests. */
export function minimalUserBody(userName: string): string {
	return JSON.stringify({
		schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
		userName,
		active: true,
	});
}
