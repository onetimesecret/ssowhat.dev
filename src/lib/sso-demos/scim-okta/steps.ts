// src/lib/sso-demos/scim-okta/steps.ts

import type { Step } from '$lib/sso-demos';

/**
 * SCIM 2.0 provisioning flow with Okta as the provisioning client and
 * OTS as the SCIM server (base URL: https://secrets.example.com/scim/v2).
 *
 * This demo is fundamentally different from the auth demos: there is no
 * end-user browser in the protocol at all. The browser column shows the
 * Okta ADMIN's console; every protocol message is a server-to-server REST
 * call from Okta to OTS, authenticated with a static Bearer token.
 *
 * SCIM answers a question SAML and OIDC never do: how does an account come
 * to exist in the application before the first login, and how does it go
 * away when the employee leaves? Provisioning and authentication are
 * separate systems that share identifiers -- SCIM creates the account,
 * SAML signs into it, and the join key between them is the userName /
 * NameID email address.
 *
 * Specs:
 *   RFC 7643 -- SCIM Core Schema (User, Group, meta, externalId)
 *   RFC 7644 -- SCIM Protocol (ListResponse, PatchOp, filter syntax)
 */
export const STEPS: Step[] = [
	{
		id: 1,
		title: 'Admin assigns Alice to the OTS app in Okta',
		userSees: 'okta-admin',
		urlBar: 'https://contoso-admin.okta.com/admin/app/ots_scim/instance/0oa7xyz/#tab-assignments',
		description:
			'An Okta administrator opens the OTS application in the Okta Admin Console and assigns alice@contoso.com to it. Alice is not involved and may not even know this is happening. The assignment does two independent things: it entitles Alice to sign in via SAML later, and -- because provisioning is enabled on this app -- it queues a provisioning job. From this point on, everything is asynchronous: Okta will work through the job in the background with server-to-server calls, and the admin console will eventually show success or a provisioning error.',
		securityNote:
			'The assignment click is the trust decision; the SCIM calls that follow are just plumbing. Note the asymmetry with the auth demos: there, every protocol message transited the browser and could be inspected in DevTools. Here the browser only talks to Okta -- the actual SCIM traffic is invisible to the admin except through Okta’s provisioning logs and the state that appears in OTS.',
		http: [
			{
				type: 'request',
				from: 'Admin Browser',
				to: 'Okta',
				method: 'POST',
				url: 'https://contoso-admin.okta.com/api/v1/apps/0oa7xyz/users',
				headers: ['Content-Type: application/json', 'Cookie: sid=okta_admin_session'],
				body: '{\n  "id": "00u1abcd2EFGHIJKL345",\n  "scope": "USER"\n}',
				note: 'Admin console assigns Okta user 00u1abcd2EFGHIJKL345 (alice@contoso.com) to the OTS app',
			},
			{
				type: 'internal',
				from: 'Okta',
				to: 'Okta',
				label: 'Queue provisioning job',
				note: 'Provisioning is enabled with "Create Users", "Update User Attributes", and "Deactivate Users" checked. Okta maps its profile attributes to SCIM attributes per the app’s attribute mappings and schedules the outbound SCIM calls.',
			},
		],
		actors: {
			browser: true,
			okta: true,
			ots: false,
		},
	},
	{
		id: 2,
		title: 'Okta checks whether the user already exists',
		userSees: 'okta-admin',
		urlBar: 'https://contoso-admin.okta.com/admin/app/ots_scim/instance/0oa7xyz/#tab-assignments',
		description:
			'Before creating anything, Okta asks OTS whether an account with this userName already exists: GET /Users with a filter expression. This is the correlation mechanism of the whole integration. SCIM has no shared database -- the only way Okta and OTS agree they are talking about the same person is by matching userName. If OTS already had an alice@contoso.com (created manually, or by a previous integration), Okta would link to that existing account instead of creating a duplicate. Here the ListResponse comes back with totalResults 0: Alice is unknown to OTS, so Okta will create her.',
		securityNote:
			'userName matching is where provisioning integrations quietly go wrong. If the SCIM server compares userName case-sensitively while the IdP normalizes to lowercase, the lookup misses and you get duplicate accounts. Worse: if an attacker can pre-register an account with a victim’s corporate email, the filter match links the IdP identity to the attacker-controlled account -- the same pre-hijacking risk as SAML JIT provisioning, surfacing here through the filter instead of an assertion.',
		http: [
			{
				type: 'server',
				from: 'Okta',
				to: 'OTS',
				method: 'GET',
				url: 'https://secrets.example.com/scim/v2/Users?filter=userName%20eq%20%22alice%40contoso.com%22&startIndex=1&count=100',
				headers: [
					'Authorization: Bearer ots_scim_tk_9f3a...redacted',
					'Accept: application/scim+json',
				],
				note: 'Decoded filter: userName eq "alice@contoso.com". SCIM filter grammar is defined in RFC 7644 §3.4.2.2; eq on userName is the only filter Okta requires a SCIM server to support. The token value and query shape here are a reconstructed example, not a capture.',
			},
			{
				type: 'server-response',
				from: 'OTS',
				to: 'Okta',
				status: '200 OK',
				headers: ['Content-Type: application/scim+json'],
				body: '{\n  "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],\n  "totalResults": 0,\n  "startIndex": 1,\n  "itemsPerPage": 0,\n  "Resources": []\n}',
				note: 'Empty ListResponse envelope: no matching user. An empty result is a 200, not a 404 -- the query succeeded, the set is empty.',
			},
		],
		actors: {
			browser: false,
			okta: true,
			ots: true,
		},
		live: {
			exchanges: [
				{
					staticRequestIndex: 0,
					staticResponseIndex: 1,
					method: 'GET',
					path: '/scim/v2/Users?filter=userName%20eq%20%22alice%40contoso.com%22&startIndex=1&count=100',
					headers: ['Accept: application/scim+json'],
				},
			],
		},
	},
	{
		id: 3,
		title: 'Okta creates the user: POST /Users',
		userSees: 'okta-admin',
		urlBar: 'https://contoso-admin.okta.com/admin/app/ots_scim/instance/0oa7xyz/#tab-assignments',
		description:
			'No existing account matched, so Okta POSTs a full User resource to OTS. The payload uses the core User schema from RFC 7643: userName as the login identifier, name components, a work email, active true, and externalId set to Alice’s Okta user ID. OTS validates the payload, creates the account, and responds 201 Created with the stored resource -- now carrying a server-assigned id and a meta block with the resource’s canonical location. The identifier ownership is deliberate and worth internalizing: the client owns externalId (Okta’s stable ID for Alice, immune to email changes), the server owns id (OTS’s primary key). Every subsequent call from Okta targets /Users/{id} using the server’s identifier, not its own.',
		securityNote:
			'The 201 response echoes the resource so the client can capture id and meta.version -- if the server assigned or normalized anything, the response is the source of truth. Note what the payload does NOT contain: a password. SCIM-provisioned accounts in an SSO setup should be created without local credentials, so the only way into the account is through the IdP. A SCIM server that auto-generates a usable password for provisioned users has quietly created a second, unmonitored door.',
		http: [
			{
				type: 'server',
				from: 'Okta',
				to: 'OTS',
				method: 'POST',
				url: 'https://secrets.example.com/scim/v2/Users',
				headers: [
					'Authorization: Bearer ots_scim_tk_9f3a...redacted',
					'Content-Type: application/scim+json',
					'Accept: application/scim+json',
				],
				body: '{ "schemas": [...], "userName": "alice@contoso.com", ... }',
				expandedPayload: {
					label: 'Full SCIM User payload (RFC 7643 core schema)',
					content: `{
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
}`,
				},
			},
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Validate and create account',
				note: 'Verify Bearer token, validate schema and required attributes, enforce userName uniqueness (return 409 with scimType "uniqueness" on conflict), assign server-side id, persist. No password is set; the account is SSO-only.',
			},
			{
				type: 'server-response',
				from: 'OTS',
				to: 'Okta',
				status: '201 Created',
				headers: [
					'Content-Type: application/scim+json',
					'Location: https://secrets.example.com/scim/v2/Users/8c1f9a2e-4b7d-4e3a-9c0d-2f5e8a716b43',
				],
				body: '{ "schemas": [...], "id": "8c1f9a2e-...", ... }',
				expandedPayload: {
					label: 'Created resource with server-assigned id and meta',
					content: `{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "8c1f9a2e-4b7d-4e3a-9c0d-2f5e8a716b43",
  "externalId": "00u1abcd2EFGHIJKL345",
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
  "active": true,
  "meta": {
    "resourceType": "User",
    "created": "2024-01-15T10:31:02Z",
    "lastModified": "2024-01-15T10:31:02Z",
    "version": "W/\\"1\\"",
    "location": "https://secrets.example.com/scim/v2/Users/8c1f9a2e-4b7d-4e3a-9c0d-2f5e8a716b43"
  }
}`,
				},
				note: 'Okta stores the returned id and uses it for all future calls about Alice. externalId (Okta’s ID) and id (OTS’s ID) now cross-reference each other.',
			},
		],
		actors: {
			browser: false,
			okta: true,
			ots: true,
		},
		live: {
			exchanges: [
				{
					staticRequestIndex: 0,
					staticResponseIndex: 2,
					method: 'POST',
					path: '/scim/v2/Users',
					headers: ['Content-Type: application/scim+json', 'Accept: application/scim+json'],
					body: `{
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
}`,
					capture: { userId: 'id' },
				},
			],
		},
	},
	{
		id: 4,
		title: 'Alice appears in OTS -- provisioned, never logged in',
		userSees: 'ots-team',
		urlBar: 'https://secrets.example.com/account/team',
		description:
			'The OTS team-members page now lists Alice: account created, role assigned, last login "never". This is the core mental model of the demo -- provisioning is not authentication. SCIM built the account; nothing has signed into it. When Alice eventually clicks the OTS tile in her Okta dashboard, the SAML flow from the companion demos runs, and the assertion’s NameID (alice@contoso.com) matches the userName SCIM wrote here. The two protocols never talk to each other directly; they rendezvous on that string.',
		securityNote:
			'The alternative to SCIM is JIT (just-in-time) provisioning, where the SP creates the account from SAML attributes at first login. JIT is simpler but can only ever create and update -- there is no login event for offboarding, so JIT-only integrations accumulate orphaned accounts of departed employees. Deprovisioning is the reason SCIM exists, and it is the half of the lifecycle this demo finishes with.',
		http: [
			{
				type: 'request',
				from: 'Admin Browser',
				to: 'OTS',
				method: 'GET',
				url: 'https://secrets.example.com/account/team',
				headers: ['Cookie: _ots_session=ots_admin_session'],
				note: 'An OTS admin (separate person, separate session) views the team page',
			},
			{
				type: 'server-response',
				from: 'OTS',
				to: 'Admin Browser',
				status: '200 OK',
				headers: ['Content-Type: text/html'],
				note: 'Team list shows alice@contoso.com: Active, provisioned via SCIM, last login: never',
			},
		],
		actors: {
			browser: true,
			okta: false,
			ots: true,
		},
	},
	{
		id: 5,
		title: 'Profile update: Okta sends PUT (full replace)',
		userSees: 'okta-admin-profile',
		urlBar: 'https://contoso-admin.okta.com/admin/user/profile/view/00u1abcd2EFGHIJKL345',
		description:
			'The admin edits Alice’s profile in Okta -- say, her surname changes to Nguyen after a name change in HR. Okta pushes the change with PUT /Users/{id}. Here is the real-world nuance: RFC 7644 offers PATCH for sparse updates, but Okta sends PUT with the complete resource for profile updates, replacing the whole User. This is a defensible engineering choice -- PUT is idempotent and immune to the operational complexity of SCIM PATCH path expressions -- but it has a sharp implication for the SCIM server. RFC 7644 §3.5.1 says writable attributes omitted from a PUT body MAY be assumed to be unasserted by the client: the provider MAY clear any existing values, or MAY assign a default instead. The spec leaves the choice to the implementation, so what actually happens depends on the SCIM server in use; check its documentation and test it. If it does clear unasserted attributes, OTS must not store authoritative state in SCIM-managed attributes that Okta does not know about, or every profile sync will silently erase it.',
		securityNote:
			'PUT-as-full-replace means the provisioning client’s attribute mappings effectively own the user record. If OTS let users self-edit their display name, the next Okta push overwrites it with whatever Okta has. Design rule for SCIM servers: partition attributes into IdP-owned (replaced on PUT) and app-owned (stored outside the SCIM-mapped set), and never blend the two in one column. The meta.version weak ETag in responses exists so clients that care can do If-Match concurrency control -- Okta does not send If-Match, which is another way of saying last-write-wins, and Okta writes last.',
		http: [
			{
				type: 'request',
				from: 'Admin Browser',
				to: 'Okta',
				method: 'POST',
				url: 'https://contoso-admin.okta.com/api/v1/users/00u1abcd2EFGHIJKL345',
				headers: ['Content-Type: application/json', 'Cookie: sid=okta_admin_session'],
				body: '{\n  "profile": {\n    "lastName": "Nguyen",\n    "displayName": "Alice Nguyen"\n  }\n}',
				note: 'Admin saves the profile change in the Okta console; Okta queues a provisioning update for every app with provisioning enabled',
			},
			{
				type: 'server',
				from: 'Okta',
				to: 'OTS',
				method: 'PUT',
				url: 'https://secrets.example.com/scim/v2/Users/8c1f9a2e-4b7d-4e3a-9c0d-2f5e8a716b43',
				headers: [
					'Authorization: Bearer ots_scim_tk_9f3a...redacted',
					'Content-Type: application/scim+json',
					'Accept: application/scim+json',
				],
				body: '{ "schemas": [...], "userName": "alice@contoso.com", "name": { "familyName": "Nguyen", ... }, ... }',
				expandedPayload: {
					label: 'Full replacement resource -- every attribute, not just the changed one',
					content: `{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "8c1f9a2e-4b7d-4e3a-9c0d-2f5e8a716b43",
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
}`,
				},
				note: 'Only familyName and displayName changed, but the entire resource is sent. Anything OTS stored in a SCIM-mapped attribute that is absent here is unasserted, and the server is permitted (not required) to clear it or reset it to a default.',
			},
			{
				type: 'server-response',
				from: 'OTS',
				to: 'Okta',
				status: '200 OK',
				headers: ['Content-Type: application/scim+json'],
				body: '{ "schemas": [...], "id": "8c1f9a2e-...", "meta": { "version": "W/\\"2\\"", ... }, ... }',
				note: 'Updated resource returned; meta.lastModified and meta.version advance',
			},
		],
		actors: {
			browser: true,
			okta: true,
			ots: true,
		},
		live: {
			exchanges: [
				{
					staticRequestIndex: 1,
					staticResponseIndex: 2,
					method: 'PUT',
					path: '/scim/v2/Users/{{userId}}',
					headers: ['Content-Type: application/scim+json', 'Accept: application/scim+json'],
					body: `{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "{{userId}}",
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
}`,
				},
			],
			requires: ['userId'],
		},
	},
	{
		id: 6,
		title: 'Group push: map an Okta group to an OTS role',
		userSees: 'okta-admin',
		urlBar: 'https://contoso-admin.okta.com/admin/app/ots_scim/instance/0oa7xyz/#tab-group-push',
		description:
			'The admin enables Group Push for the "OTS Admins" Okta group. Group lifecycle is a separate resource type with its own endpoints: Okta first creates the group with POST /Groups, then maintains membership with PATCH /Groups/{id} using the PatchOp message format -- op "add" on the members path, referencing users by their OTS-side id. On the OTS end, the group maps to an application role: membership in the pushed group grants admin capability in OTS. This is how role-based access ends up centrally administered in the IdP instead of hand-managed per app.',
		securityNote:
			'Group membership changes are authorization changes delivered over the same Bearer-token channel as everything else -- whoever holds the SCIM token can add themselves to the admins group with one PATCH. Also note the double bookkeeping hazard: groups can arrive via SCIM (persistent membership) and via SAML attributes (per-login claims), and the two can disagree. Pick one source of truth per role; OTS treating the SCIM-pushed group as authoritative and ignoring the SAML groups attribute for this role is the coherent choice.',
		http: [
			{
				type: 'request',
				from: 'Admin Browser',
				to: 'Okta',
				method: 'POST',
				url: 'https://contoso-admin.okta.com/admin/app/ots_scim/instance/0oa7xyz/group-push',
				headers: ['Content-Type: application/json', 'Cookie: sid=okta_admin_session'],
				body: '{\n  "groupId": "00g9wxyz8MNOPQRS678",\n  "status": "ACTIVE"\n}',
				note: 'Admin enables Group Push for the "OTS Admins" Okta group',
			},
			{
				type: 'server',
				from: 'Okta',
				to: 'OTS',
				method: 'POST',
				url: 'https://secrets.example.com/scim/v2/Groups',
				headers: [
					'Authorization: Bearer ots_scim_tk_9f3a...redacted',
					'Content-Type: application/scim+json',
					'Accept: application/scim+json',
				],
				body: '{\n  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],\n  "displayName": "OTS Admins",\n  "members": []\n}',
				note: 'Group created first, membership managed by subsequent PATCHes',
			},
			{
				type: 'server-response',
				from: 'OTS',
				to: 'Okta',
				status: '201 Created',
				headers: [
					'Content-Type: application/scim+json',
					'Location: https://secrets.example.com/scim/v2/Groups/5d2e7f10-9a4c-4b8e-b1d6-3c9f0a824e57',
				],
				body: '{\n  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],\n  "id": "5d2e7f10-9a4c-4b8e-b1d6-3c9f0a824e57",\n  "displayName": "OTS Admins",\n  "members": [],\n  "meta": {\n    "resourceType": "Group",\n    "location": "https://secrets.example.com/scim/v2/Groups/5d2e7f10-9a4c-4b8e-b1d6-3c9f0a824e57"\n  }\n}',
			},
			{
				type: 'server',
				from: 'Okta',
				to: 'OTS',
				method: 'PATCH',
				url: 'https://secrets.example.com/scim/v2/Groups/5d2e7f10-9a4c-4b8e-b1d6-3c9f0a824e57',
				headers: [
					'Authorization: Bearer ots_scim_tk_9f3a...redacted',
					'Content-Type: application/scim+json',
					'Accept: application/scim+json',
				],
				body: '{ "schemas": ["...PatchOp"], "Operations": [{ "op": "add", "path": "members", ... }] }',
				expandedPayload: {
					label: 'PatchOp envelope (RFC 7644 §3.5.2) adding Alice to the group',
					content: `{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "add",
      "path": "members",
      "value": [
        {
          "value": "8c1f9a2e-4b7d-4e3a-9c0d-2f5e8a716b43",
          "display": "alice@contoso.com"
        }
      ]
    }
  ]
}`,
				},
				note: 'Members are referenced by OTS-side user id -- the id from step 3, not the Okta id',
			},
			{
				type: 'server-response',
				from: 'OTS',
				to: 'Okta',
				status: '200 OK',
				headers: ['Content-Type: application/scim+json'],
				note: 'OTS maps membership in "OTS Admins" to its admin role: Alice is now an OTS admin without anyone touching OTS',
			},
		],
		actors: {
			browser: true,
			okta: true,
			ots: true,
		},
	},
	{
		id: 7,
		title: 'Offboarding: unassignment triggers deactivation',
		userSees: 'okta-admin',
		urlBar: 'https://contoso-admin.okta.com/admin/app/ots_scim/instance/0oa7xyz/#tab-assignments',
		description:
			'Alice leaves the company. The admin (or an HR-driven workflow) deactivates her in Okta, which unassigns her from the OTS app. Okta does not send DELETE /Users/{id} -- it sends PATCH with a single replace operation setting active to false. This soft-delete convention is near-universal among IdPs, and for good reason: hard deletion destroys audit history, orphans owned resources (Alice’s secrets, links, audit trail), and is unrecoverable when the offboarding turns out to be a mistake or a rehire. OTS keeps the record, blocks authentication against it, and can reactivate it later with the same PATCH in reverse. A SCIM server should still implement DELETE for spec compliance, but active: false is the path that actually runs in production.',
		securityNote:
			'The classic gap: deactivation is NOT session revocation. This PATCH tells OTS "do not let Alice in again" -- it says nothing about the OTS session cookie already living in her browser from this morning’s login. Unless OTS terminates existing sessions when active flips to false, a deprovisioned user retains access until her session expires, which for long-lived sessions can be days. Well-built SCIM servers treat active: false as a two-part command: flag the account AND revoke its live sessions and API tokens. Verify this behavior explicitly when evaluating any SCIM implementation; the spec does not require it and many implementations skip it.',
		http: [
			{
				type: 'request',
				from: 'Admin Browser',
				to: 'Okta',
				method: 'DELETE',
				url: 'https://contoso-admin.okta.com/api/v1/apps/0oa7xyz/users/00u1abcd2EFGHIJKL345',
				headers: ['Cookie: sid=okta_admin_session'],
				note: 'Admin unassigns Alice from the OTS app in the Okta console',
			},
			{
				type: 'server',
				from: 'Okta',
				to: 'OTS',
				method: 'PATCH',
				url: 'https://secrets.example.com/scim/v2/Users/8c1f9a2e-4b7d-4e3a-9c0d-2f5e8a716b43',
				headers: [
					'Authorization: Bearer ots_scim_tk_9f3a...redacted',
					'Content-Type: application/scim+json',
					'Accept: application/scim+json',
				],
				body: '{ "schemas": ["...PatchOp"], "Operations": [{ "op": "replace", "value": { "active": false } }] }',
				expandedPayload: {
					label: 'Deactivation PatchOp -- soft delete, not DELETE',
					content: `{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "replace",
      "value": {
        "active": false
      }
    }
  ]
}`,
				},
				note: 'No path attribute: the value object is applied against the resource root, per RFC 7644 §3.5.2.3. Okta uses this exact shape for deactivation.',
			},
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Deactivate account and revoke sessions',
				note: 'Set active=false, block future logins, terminate live sessions and API tokens for this user. The session revocation is OTS going beyond what SCIM mandates -- and it is the part that matters most.',
			},
			{
				type: 'server-response',
				from: 'OTS',
				to: 'Okta',
				status: '200 OK',
				headers: ['Content-Type: application/scim+json'],
				body: '{ "schemas": [...], "id": "8c1f9a2e-...", "active": false, "meta": { "version": "W/\\"3\\"", ... }, ... }',
				note: 'Updated resource confirms active: false. Okta marks the deprovisioning task complete.',
			},
		],
		actors: {
			browser: true,
			okta: true,
			ots: true,
		},
		live: {
			exchanges: [
				{
					staticRequestIndex: 1,
					staticResponseIndex: 3,
					method: 'PATCH',
					path: '/scim/v2/Users/{{userId}}',
					headers: ['Content-Type: application/scim+json', 'Accept: application/scim+json'],
					body: `{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "replace",
      "value": {
        "active": false
      }
    }
  ]
}`,
				},
			],
			requires: ['userId'],
		},
	},
	{
		id: 8,
		title: 'Final state: Alice deactivated in OTS',
		userSees: 'ots-team-deactivated',
		urlBar: 'https://secrets.example.com/account/team',
		description:
			'The OTS team page shows the completed lifecycle: Alice’s account exists but is deactivated -- greyed out, sign-in blocked, her data and audit trail intact. If she attempted the SAML flow now, Okta would refuse first (she is unassigned from the app), and OTS would refuse second (active is false). That layering is the point: deprovisioning enforced independently at both the IdP and the application, so a mistake or compromise at either layer does not by itself re-open access. If Alice is rehired, reassignment in Okta replays this same machinery -- the step-2 filter finds her existing account, and a PATCH flips active back to true.',
		securityNote:
			'Operational realities to carry out of this demo: (1) the static Bearer token is the weakest link -- it is long-lived, rarely rotated, and grants full lifecycle control over every account, so store it in a secret manager, scope the endpoint to it alone, and rotate on a schedule; (2) the /scim/v2 endpoint must reject unauthenticated requests outright, rate-limit aggressively, and treat the filter parameter as untrusted input -- parse it with a real RFC 7644 grammar parser, never by interpolating it into a query, or "filter injection" becomes SQL injection with an enterprise price tag; (3) delivery is asynchronous and retried -- a property of Okta’s push scheduling, not of SCIM, which is plain synchronous HTTP with no consistency model. PUT and DELETE are idempotent; POST /Users is not. A replayed POST for an existing userName must return 409 with scimType "uniqueness" (RFC 7644 §3.3), and the client should read that as "already created". Design for retries converging, not for every operation being replay-safe.',
		http: [
			{
				type: 'request',
				from: 'Admin Browser',
				to: 'OTS',
				method: 'GET',
				url: 'https://secrets.example.com/account/team',
				headers: ['Cookie: _ots_session=ots_admin_session'],
			},
			{
				type: 'server-response',
				from: 'OTS',
				to: 'Admin Browser',
				status: '200 OK',
				headers: ['Content-Type: text/html'],
				note: 'Team list shows alice@contoso.com: Deactivated (via SCIM). Account retained for audit; login blocked at both Okta and OTS.',
			},
		],
		actors: {
			browser: true,
			okta: false,
			ots: true,
		},
	},
];
