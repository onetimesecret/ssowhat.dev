// packages/mock-server/test/users.test.ts

import { describe, expect, it } from 'vitest';
import {
	BASE_URL,
	CREATE_ALICE_BODY,
	DEACTIVATE_BODY,
	STATIC_FIXTURE_ID,
	authedReq,
	makeApp,
	minimalUserBody,
	newSession,
	putNguyenBody,
	seedAlice,
} from './helpers.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JSON_HEADERS = { 'Content-Type': 'application/scim+json' };

describe('POST /Users', () => {
	it('POST /Users creates user, returns 201 with Location header and server-assigned uuid id', async () => {
		const { app } = makeApp();
		const { res, body, id } = await seedAlice(app, newSession());
		expect(res.status).toBe(201);
		expect(id).toMatch(UUID_RE);
		expect(res.headers.get('Location')).toBe(`${BASE_URL}/scim/v2/Users/${id}`);
		expect(body.meta.location).toBe(`${BASE_URL}/scim/v2/Users/${id}`);
	});

	it('POST /Users response body matches canonical key order and W/"1" version', async () => {
		const { app } = makeApp();
		const res = await authedReq(app, newSession(), '/scim/v2/Users', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: CREATE_ALICE_BODY,
		});
		const parsed = JSON.parse(await res.text()) as Record<string, unknown>;
		expect(Object.keys(parsed)).toEqual([
			'schemas',
			'id',
			'externalId',
			'userName',
			'name',
			'displayName',
			'emails',
			'active',
			'meta',
		]);
		const meta = parsed.meta as Record<string, unknown>;
		expect(Object.keys(meta)).toEqual(['resourceType', 'created', 'lastModified', 'version', 'location']);
		expect(meta.version).toBe('W/"1"');
		expect(meta.created).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
	});

	it('POST /Users id differs from the static fixture id 8c1f9a2e-...', async () => {
		const { app } = makeApp();
		const { id } = await seedAlice(app, newSession());
		expect(id).not.toBe(STATIC_FIXTURE_ID);
	});

	it('POST /Users strips client-sent password and never echoes one', async () => {
		const { app } = makeApp();
		const session = newSession();
		const withPassword = JSON.stringify({
			...(JSON.parse(CREATE_ALICE_BODY) as Record<string, unknown>),
			password: 'hunter2',
		});
		const res = await authedReq(app, session, '/scim/v2/Users', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: withPassword,
		});
		expect(res.status).toBe(201);
		const text = await res.text();
		expect(text).not.toContain('password');
		expect(text).not.toContain('hunter2');
		const id = (JSON.parse(text) as Record<string, any>).id as string;
		const got = await authedReq(app, session, `/scim/v2/Users/${id}`);
		expect(await got.text()).not.toContain('hunter2');
	});

	it('POST /Users ignores client-sent id and meta', async () => {
		const { app } = makeApp();
		const withServerOwned = JSON.stringify({
			...(JSON.parse(CREATE_ALICE_BODY) as Record<string, unknown>),
			id: 'attacker-chosen-id',
			meta: { resourceType: 'Admin', version: 'W/"999"' },
		});
		const res = await authedReq(app, newSession(), '/scim/v2/Users', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: withServerOwned,
		});
		expect(res.status).toBe(201);
		const body = (await res.json()) as Record<string, any>;
		expect(body.id).not.toBe('attacker-chosen-id');
		expect(body.id).toMatch(UUID_RE);
		expect(body.meta.resourceType).toBe('User');
		expect(body.meta.version).toBe('W/"1"');
	});

	it('POST /Users duplicate userName returns 409 with scimType uniqueness', async () => {
		const { app } = makeApp();
		const session = newSession();
		await seedAlice(app, session);
		const res = await authedReq(app, session, '/scim/v2/Users', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: CREATE_ALICE_BODY,
		});
		expect(res.status).toBe(409);
		const body = (await res.json()) as Record<string, any>;
		expect(body.schemas).toEqual(['urn:ietf:params:scim:api:messages:2.0:Error']);
		expect(body.status).toBe('409');
		expect(body.scimType).toBe('uniqueness');
		expect(body.detail).toBe('userName alice@contoso.com already exists');
	});

	it('POST /Users duplicate userName is detected case-insensitively', async () => {
		const { app } = makeApp();
		const session = newSession();
		await seedAlice(app, session);
		const res = await authedReq(app, session, '/scim/v2/Users', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: minimalUserBody('ALICE@CONTOSO.COM'),
		});
		expect(res.status).toBe(409);
		expect(((await res.json()) as Record<string, any>).scimType).toBe('uniqueness');
	});

	it('POST /Users without userName returns 400 invalidValue', async () => {
		const { app } = makeApp();
		const res = await authedReq(app, newSession(), '/scim/v2/Users', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'], active: true }),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as Record<string, any>;
		expect(body.status).toBe('400');
		expect(body.scimType).toBe('invalidValue');
	});
});

describe('GET /Users/:id', () => {
	it('GET /Users/:id returns the stored resource', async () => {
		const { app } = makeApp();
		const session = newSession();
		const { id } = await seedAlice(app, session);
		const res = await authedReq(app, session, `/scim/v2/Users/${id}`);
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, any>;
		expect(body.id).toBe(id);
		expect(body.userName).toBe('alice@contoso.com');
		expect(body.externalId).toBe('00u1abcd2EFGHIJKL345');
	});

	it('GET /Users/:id unknown returns 404 scim error envelope', async () => {
		const { app } = makeApp();
		const missing = crypto.randomUUID();
		const res = await authedReq(app, newSession(), `/scim/v2/Users/${missing}`);
		expect(res.status).toBe(404);
		const body = (await res.json()) as Record<string, any>;
		expect(body.schemas).toEqual(['urn:ietf:params:scim:api:messages:2.0:Error']);
		expect(body.status).toBe('404');
		expect(body.detail).toBe(`Resource ${missing} not found`);
	});
});

describe('PUT /Users/:id', () => {
	it('PUT /Users/:id replaces resource, clears absent attributes, bumps version to W/"2", preserves meta.created', async () => {
		const { app, advance } = makeApp();
		const session = newSession();
		const { body: created, id } = await seedAlice(app, session);
		advance(60_000);
		// Step-5 body minus displayName: full-replace must clear it.
		const putBody = JSON.parse(putNguyenBody(id)) as Record<string, unknown>;
		delete putBody.displayName;
		const res = await authedReq(app, session, `/scim/v2/Users/${id}`, {
			method: 'PUT',
			headers: JSON_HEADERS,
			body: JSON.stringify(putBody),
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, any>;
		expect(body.name.familyName).toBe('Nguyen');
		expect(body).not.toHaveProperty('displayName');
		expect(body.meta.version).toBe('W/"2"');
		expect(body.meta.created).toBe(created.meta.created);
		expect(body.meta.lastModified).not.toBe(created.meta.lastModified);
	});

	it('PUT /Users/:id ignores body id, path id is authoritative', async () => {
		const { app } = makeApp();
		const session = newSession();
		const { id } = await seedAlice(app, session);
		const res = await authedReq(app, session, `/scim/v2/Users/${id}`, {
			method: 'PUT',
			headers: JSON_HEADERS,
			body: putNguyenBody('body-supplied-id-to-ignore'),
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, any>;
		expect(body.id).toBe(id);
		expect(body.meta.location).toBe(`${BASE_URL}/scim/v2/Users/${id}`);
	});

	it('PUT /Users/:id unknown returns 404', async () => {
		const { app } = makeApp();
		const missing = crypto.randomUUID();
		const res = await authedReq(app, newSession(), `/scim/v2/Users/${missing}`, {
			method: 'PUT',
			headers: JSON_HEADERS,
			body: putNguyenBody(missing),
		});
		expect(res.status).toBe(404);
	});
});

describe('PATCH /Users/:id', () => {
	it('PATCH /Users/:id replace with no path merges {active:false} and bumps version', async () => {
		const { app } = makeApp();
		const session = newSession();
		const { id } = await seedAlice(app, session);
		const res = await authedReq(app, session, `/scim/v2/Users/${id}`, {
			method: 'PATCH',
			headers: JSON_HEADERS,
			body: DEACTIVATE_BODY,
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, any>;
		expect(body.active).toBe(false);
		expect(body.meta.version).toBe('W/"2"');
	});

	it('PATCH /Users/:id replace with path "active" works', async () => {
		const { app } = makeApp();
		const session = newSession();
		const { id } = await seedAlice(app, session);
		const res = await authedReq(app, session, `/scim/v2/Users/${id}`, {
			method: 'PATCH',
			headers: JSON_HEADERS,
			body: JSON.stringify({
				schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
				Operations: [{ op: 'replace', path: 'active', value: false }],
			}),
		});
		expect(res.status).toBe(200);
		expect(((await res.json()) as Record<string, any>).active).toBe(false);
	});

	it('PATCH /Users/:id accepts op and path case-insensitively', async () => {
		const { app } = makeApp();
		const session = newSession();
		const { id } = await seedAlice(app, session);
		const res = await authedReq(app, session, `/scim/v2/Users/${id}`, {
			method: 'PATCH',
			headers: JSON_HEADERS,
			body: JSON.stringify({
				schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
				Operations: [{ op: 'Replace', path: 'Active', value: false }],
			}),
		});
		expect(res.status).toBe(200);
		expect(((await res.json()) as Record<string, any>).active).toBe(false);
	});

	it('PATCH no-path replace coerces the Okta "false" string-boolean for active', async () => {
		const { app } = makeApp();
		const session = newSession();
		const { id } = await seedAlice(app, session);
		const res = await authedReq(app, session, `/scim/v2/Users/${id}`, {
			method: 'PATCH',
			headers: JSON_HEADERS,
			body: '{"schemas":["urn:ietf:params:scim:api:messages:2.0:PatchOp"],"Operations":[{"op":"replace","value":{"active":"false"}}]}',
		});
		expect(res.status).toBe(200);
		expect(((await res.json()) as Record<string, any>).active).toBe(false);
	});

	it('PATCH no-path replace with an uncoercible active value returns 400, not a silent no-op', async () => {
		const { app } = makeApp();
		const session = newSession();
		const { id } = await seedAlice(app, session);
		const res = await authedReq(app, session, `/scim/v2/Users/${id}`, {
			method: 'PATCH',
			headers: JSON_HEADERS,
			body: '{"schemas":["urn:ietf:params:scim:api:messages:2.0:PatchOp"],"Operations":[{"op":"replace","value":{"active":"nope"}}]}',
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as Record<string, any>;
		expect(body.scimType).toBe('invalidValue');
		// The resource is untouched: still active, version unchanged.
		const check = await authedReq(app, session, `/scim/v2/Users/${id}`);
		const user = (await check.json()) as Record<string, any>;
		expect(user.active).toBe(true);
		expect(user.meta.version).toBe('W/"1"');
	});

	it('PATCH /Users/:id repeated deactivate returns 200 and still increments version', async () => {
		const { app } = makeApp();
		const session = newSession();
		const { id } = await seedAlice(app, session);
		const patch = () =>
			authedReq(app, session, `/scim/v2/Users/${id}`, {
				method: 'PATCH',
				headers: JSON_HEADERS,
				body: DEACTIVATE_BODY,
			});
		await patch();
		const res = await patch();
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, any>;
		expect(body.active).toBe(false);
		expect(body.meta.version).toBe('W/"3"');
	});

	it('PATCH /Users/:id with add op returns 400 invalidPath', async () => {
		const { app } = makeApp();
		const session = newSession();
		const { id } = await seedAlice(app, session);
		const res = await authedReq(app, session, `/scim/v2/Users/${id}`, {
			method: 'PATCH',
			headers: JSON_HEADERS,
			body: JSON.stringify({
				schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
				Operations: [{ op: 'add', path: 'members', value: [] }],
			}),
		});
		expect(res.status).toBe(400);
		expect(((await res.json()) as Record<string, any>).scimType).toBe('invalidPath');
	});

	it('PATCH /Users/:id without PatchOp schema urn returns 400', async () => {
		const { app } = makeApp();
		const session = newSession();
		const { id } = await seedAlice(app, session);
		const res = await authedReq(app, session, `/scim/v2/Users/${id}`, {
			method: 'PATCH',
			headers: JSON_HEADERS,
			body: JSON.stringify({
				schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
				Operations: [{ op: 'replace', value: { active: false } }],
			}),
		});
		expect(res.status).toBe(400);
		expect(((await res.json()) as Record<string, any>).status).toBe('400');
	});
});

describe('DELETE /Users/:id', () => {
	it('DELETE /Users/:id returns 204 and subsequent GET is 404', async () => {
		const { app } = makeApp();
		const session = newSession();
		const { id } = await seedAlice(app, session);
		const del = await authedReq(app, session, `/scim/v2/Users/${id}`, { method: 'DELETE' });
		expect(del.status).toBe(204);
		expect(await del.text()).toBe('');
		const got = await authedReq(app, session, `/scim/v2/Users/${id}`);
		expect(got.status).toBe(404);
	});
});

describe('lifecycle', () => {
	it('full lifecycle POST -> PUT -> PATCH yields version chain W/"1" W/"2" W/"3" and Nguyen/active:false final state', async () => {
		const { app, advance } = makeApp();
		const session = newSession();
		const { body: created, id } = await seedAlice(app, session);
		expect(created.meta.version).toBe('W/"1"');

		advance(30_000);
		const put = await authedReq(app, session, `/scim/v2/Users/${id}`, {
			method: 'PUT',
			headers: JSON_HEADERS,
			body: putNguyenBody(id),
		});
		expect(((await put.json()) as Record<string, any>).meta.version).toBe('W/"2"');

		advance(30_000);
		const patch = await authedReq(app, session, `/scim/v2/Users/${id}`, {
			method: 'PATCH',
			headers: JSON_HEADERS,
			body: DEACTIVATE_BODY,
		});
		expect(((await patch.json()) as Record<string, any>).meta.version).toBe('W/"3"');

		const final = await authedReq(app, session, `/scim/v2/Users/${id}`);
		const body = (await final.json()) as Record<string, any>;
		expect(body.name.familyName).toBe('Nguyen');
		expect(body.displayName).toBe('Alice Nguyen');
		expect(body.active).toBe(false);
		expect(body.meta.version).toBe('W/"3"');
		expect(body.meta.created).toBe(created.meta.created);
	});

	it('all /scim/v2 responses carry Content-Type application/scim+json', async () => {
		const { app } = makeApp();
		const session = newSession();
		const { res: create } = await seedAlice(app, session);
		const list = await authedReq(app, session, '/scim/v2/Users');
		const missing = await authedReq(app, session, `/scim/v2/Users/${crypto.randomUUID()}`);
		const unauthed = await app.request('/scim/v2/Users', {
			headers: { 'X-Demo-Session': session },
		});
		const badFilter = await authedReq(app, session, '/scim/v2/Users?filter=garbage');
		for (const res of [create, list, missing, unauthed, badFilter]) {
			expect(res.headers.get('Content-Type')).toBe('application/scim+json');
		}
	});
});
