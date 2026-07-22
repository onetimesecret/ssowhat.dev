// packages/mock-server/test/filter.test.ts

import { describe, expect, it } from 'vitest';
import { parseFilter } from '../src/scim/filter.js';
import {
	FILTER_ALICE_PATH,
	STATIC_EMPTY_LIST,
	authedReq,
	makeApp,
	newSession,
	seedAlice,
} from './helpers.js';

describe('GET /Users filter', () => {
	it('GET /Users with userName eq filter returns the matching user', async () => {
		const { app } = makeApp();
		const session = newSession();
		const { id } = await seedAlice(app, session);
		const res = await authedReq(app, session, FILTER_ALICE_PATH);
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, any>;
		expect(body.totalResults).toBe(1);
		expect(body.itemsPerPage).toBe(1);
		expect(body.Resources).toHaveLength(1);
		expect(body.Resources[0].id).toBe(id);
		expect(body.Resources[0].userName).toBe('alice@contoso.com');
	});

	it('GET /Users filter matches userName case-insensitively', async () => {
		const { app } = makeApp();
		const session = newSession();
		await seedAlice(app, session);
		const res = await authedReq(
			app,
			session,
			'/scim/v2/Users?filter=userName%20eq%20%22ALICE%40CONTOSO.COM%22',
		);
		expect(res.status).toBe(200);
		expect(((await res.json()) as Record<string, any>).totalResults).toBe(1);
	});

	it('GET /Users filter with no match returns 200 empty ListResponse byte-identical to static step 2 body', async () => {
		const { app } = makeApp();
		const res = await authedReq(app, newSession(), FILTER_ALICE_PATH);
		expect(res.status).toBe(200);
		expect(await res.text()).toBe(STATIC_EMPTY_LIST);
	});

	it('GET /Users with unsupported attribute filter returns 400 invalidFilter', async () => {
		const { app } = makeApp();
		const res = await authedReq(
			app,
			newSession(),
			'/scim/v2/Users?filter=displayName%20eq%20%22Alice%20Smith%22',
		);
		expect(res.status).toBe(400);
		const body = (await res.json()) as Record<string, any>;
		expect(body.status).toBe('400');
		expect(body.scimType).toBe('invalidFilter');
	});

	it('GET /Users with unparseable filter returns 400 invalidFilter', async () => {
		const { app } = makeApp();
		const res = await authedReq(app, newSession(), '/scim/v2/Users?filter=userName%20eq%20unquoted');
		expect(res.status).toBe(400);
		expect(((await res.json()) as Record<string, any>).scimType).toBe('invalidFilter');
	});

	it('GET /Users with co operator returns 400 invalidFilter', async () => {
		const { app } = makeApp();
		const res = await authedReq(app, newSession(), '/scim/v2/Users?filter=userName%20co%20%22alice%22');
		expect(res.status).toBe(400);
		expect(((await res.json()) as Record<string, any>).scimType).toBe('invalidFilter');
	});

	it('GET /Users with no filter lists session users', async () => {
		const { app } = makeApp();
		const session = newSession();
		const { id } = await seedAlice(app, session);
		const res = await authedReq(app, session, '/scim/v2/Users');
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, any>;
		expect(body.totalResults).toBe(1);
		expect(body.Resources[0].id).toBe(id);
	});

	it('parseFilter unit: accepts extra whitespace around eq', () => {
		expect(parseFilter('userName    eq   "alice@contoso.com"')).toEqual({ value: 'alice@contoso.com' });
		expect(parseFilter('  userName eq "x"  ')).toEqual({ value: 'x' });
		expect(parseFilter('USERNAME eq "x"')).toEqual({ value: 'x' });
		expect(parseFilter('displayName eq "x"')).toBeNull();
		expect(parseFilter('userName co "x"')).toBeNull();
	});
});
