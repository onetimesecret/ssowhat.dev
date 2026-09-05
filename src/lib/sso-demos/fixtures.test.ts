// src/lib/sso-demos/fixtures.test.ts
//
// Lint for the static demo fixtures. The HttpMessage `type` doc in types.ts
// says `request`/`response` are browser-facing hops and `server`/
// `server-response` are hops the browser never sees; this keeps every demo's
// steps.ts honest about that, since HttpEntry and the transcript label and
// colour entries by type alone.

import { describe, expect, it } from 'vitest';
import type { HttpMessage, Step } from './types.js';
import { STEPS as idpSamlOkta } from './idp-saml-okta/steps.js';
import { STEPS as multiIdpDiscovery } from './multi-idp-discovery/steps.js';
import { STEPS as oauth2Google } from './oauth2-google/steps.js';
import { STEPS as oidcEntra } from './oidc-entra/steps.js';
import { STEPS as oidcSamlBridge } from './oidc-saml-bridge/steps.js';
import { STEPS as scimOkta } from './scim-okta/steps.js';
import { STEPS as sloSamlOkta } from './slo-saml-okta/steps.js';
import { STEPS as spSamlOkta } from './sp-saml-okta/steps.js';

const DEMOS: Record<string, Step[]> = {
	'idp-saml-okta': idpSamlOkta,
	'multi-idp-discovery': multiIdpDiscovery,
	'oauth2-google': oauth2Google,
	'oidc-entra': oidcEntra,
	'oidc-saml-bridge': oidcSamlBridge,
	'scim-okta': scimOkta,
	'slo-saml-okta': sloSamlOkta,
	'sp-saml-okta': spSamlOkta,
};

// Actor labels may carry a parenthetical about the relay path, e.g. "Browser (via
// Caddy)" or "Caddy (relays to Browser)"; only the primary actor counts.
const isBrowser = (actor: string): boolean => /browser/i.test(actor.replace(/\(.*?\)/g, '').trim());

function messages(steps: Step[]): Array<{ stepId: number; message: HttpMessage }> {
	return steps.flatMap((step) => (step.http ?? []).map((message) => ({ stepId: step.id, message })));
}

describe.each(Object.entries(DEMOS))('%s fixtures', (_name, steps) => {
	it('uses request/response only for hops that touch the browser', () => {
		const offenders = messages(steps)
			.filter(({ message }) => message.type === 'request' || message.type === 'response')
			.filter(({ message }) => !isBrowser(message.type === 'request' ? message.from : message.to))
			.map(({ stepId, message }) => `step ${stepId}: ${message.type} ${message.from} -> ${message.to}`);
		expect(offenders).toEqual([]);
	});

	it('uses server/server-response only for hops the browser never sees', () => {
		const offenders = messages(steps)
			.filter(({ message }) => message.type === 'server' || message.type === 'server-response')
			.filter(({ message }) => isBrowser(message.from) || isBrowser(message.to))
			.map(({ stepId, message }) => `step ${stepId}: ${message.type} ${message.from} -> ${message.to}`);
		expect(offenders).toEqual([]);
	});
});
