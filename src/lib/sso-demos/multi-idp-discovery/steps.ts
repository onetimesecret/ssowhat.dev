// src/lib/sso-demos/multi-idp-discovery/steps.ts

import type { Step } from '$lib/sso-demos';

/**
 * Multi-IdP home-realm discovery (identifier-first login).
 *
 * OTS serves many customer organizations, each with its own IdP. Instead of
 * a wall of "Sign in with X" buttons, OTS asks for the user's work email
 * first, maps the domain to the organization's registered IdP, and starts
 * whichever protocol that IdP speaks:
 *
 *   contoso.com -> Microsoft Entra ID via OIDC (Alice's flow, steps 1-5)
 *   acme.com    -> Okta via SAML 2.0          (Bob's flow, steps 6-8)
 *
 * The per-protocol details are compressed here; the oidc-entra and
 * sp-saml-okta demos walk each protocol step by step. This demo focuses on
 * the discovery decision and the realm-binding checks it makes necessary.
 */
export const STEPS: Step[] = [
	{
		id: 1,
		title: 'One sign-in page, many identity providers',
		userSees: 'signin',
		urlBar: 'https://secrets.example.com/signin',
		description:
			'OTS sells to many companies, and each brings its own IdP: Contoso runs Entra ID, Acme runs Okta. With no session and no realm hint, OTS cannot know where to redirect -- so instead of guessing, it renders an email-first sign-in page. The routing decision comes after the user identifies themselves.',
		securityNote:
			"The alternative -- one button per customer IdP -- is the 'NASCAR problem': it does not scale past a handful of providers, and it leaks your customer list to anyone who loads the page. Identifier-first login keeps the domain-to-IdP registry server-side and shows every visitor the same neutral form.",
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'OTS',
				method: 'GET',
				url: 'https://secrets.example.com/signin',
				headers: ['Cookie: (none)'],
				note: 'No session cookie, no _ots_realm hint cookie from a previous visit',
			},
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Choose sign-in mode',
				note: 'No realm hint present. Render the identifier-first form instead of redirecting to any IdP.',
			},
			{
				type: 'response',
				from: 'OTS',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: text/html', 'Cache-Control: no-store'],
				note: 'Email-first sign-in page rendered -- identical for every visitor, regardless of organization',
			},
		],
		actors: {
			browser: true,
			ots: true,
			entra: false,
			okta: false,
		},
	},
	{
		id: 2,
		title: 'Alice enters her work email',
		userSees: 'signin-alice',
		urlBar: 'https://secrets.example.com/signin',
		description:
			"Alice types alice@contoso.com and clicks Continue. OTS extracts the domain, finds contoso.com in its IdP registry mapped to Contoso's Entra tenant, and starts a standard OIDC authorization code flow -- passing login_hint so Alice doesn't retype her email, and domain_hint so Entra skips its own realm discovery.",
		securityNote:
			'Discovery is routing, not authorization. The typed domain picks which IdP to talk to and nothing more: it does not establish who Alice is, that she belongs to Contoso, or what she may access. Those come later, from the authenticated issuer, tenant, and subject. The discovery endpoint is also an oracle, since it behaves differently for customer domains than for others: rate-limit it, keep responses as uniform as possible, and treat high-volume probing as enumeration. login_hint and domain_hint are UX conveniences for the IdP, never trusted input on the way back.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'OTS',
				method: 'POST',
				url: 'https://secrets.example.com/auth/discover',
				headers: ['Content-Type: application/x-www-form-urlencoded'],
				body: 'email=alice%40contoso.com',
				note: 'Only the email leaves the browser -- no password field exists on this page. Treat this value as a routing hint, not as a claim of identity.',
			},
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Home-realm lookup',
				note: 'Domain contoso.com found in IdP registry: contoso.com -> Entra ID (OIDC, tenant contoso.onmicrosoft.com); acme.com -> Okta (SAML 2.0, org acme.okta.com); unmatched domains -> local password login. Generate PKCE parameters, state, and nonce for the OIDC flow.',
			},
			{
				type: 'response',
				from: 'OTS',
				to: 'Browser',
				status: '302 Found',
				headers: [
					'Location: https://login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/authorize?',
					'  client_id=8f3a2b1c-9d4e-4f5a-b6c7-1a2b3c4d5e6f',
					'  &redirect_uri=https://secrets.example.com/auth/callback',
					'  &response_type=code',
					'  &scope=openid profile email',
					'  &state=xYz9Kp2mN7qR4sT1',
					'  &nonce=aB3cD5eF7gH9iJ1k',
					'  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
					'  &code_challenge_method=S256',
					'  &login_hint=alice@contoso.com',
					'  &domain_hint=contoso.com',
				],
				note: "Redirect to Contoso's Entra tenant. OTS also records realm=contoso.com in the pending auth state for later verification.",
			},
		],
		actors: {
			browser: true,
			ots: true,
			entra: false,
			okta: false,
		},
	},
	{
		id: 3,
		title: 'Alice authenticates at Entra',
		userSees: 'entra-login',
		urlBar: 'https://login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/authorize?client_id=...',
		description:
			"Alice lands on her organization's Microsoft sign-in page with her email prefilled from login_hint. She authenticates under Contoso's Conditional Access policies (MFA, device checks), and Entra redirects back to OTS with a single-use authorization code. See the Entra OIDC demo for this leg in full detail.",
		securityNote:
			"From here to the callback, this is plain OIDC -- discovery changed nothing about the protocol. What OTS delegated is authentication policy: how hard it is to sign in as alice@contoso.com is now Contoso's decision, enforced in Contoso's tenant, invisible to OTS.",
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'Entra',
				method: 'GET',
				url: 'https://login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/authorize?client_id=...&login_hint=alice@contoso.com&domain_hint=contoso.com&...',
				headers: [],
				note: 'login_hint prefills the username field; domain_hint skips Entra’s own account-picker',
			},
			{
				type: 'request',
				from: 'Browser',
				to: 'Entra',
				method: 'POST',
				url: 'https://login.microsoftonline.com/contoso.onmicrosoft.com/login',
				headers: ['Content-Type: application/x-www-form-urlencoded'],
				body: 'login=alice%40contoso.com&passwd=********&ctx=...',
				note: 'Credentials + Conditional Access evaluation (MFA) in Contoso’s tenant',
			},
			{
				type: 'response',
				from: 'Entra',
				to: 'Browser',
				status: '302 Found',
				headers: ['Location: https://secrets.example.com/auth/callback?code=0.AR8AnSqjO3vZ...&state=xYz9Kp2mN7qR4sT1'],
				note: 'Single-use authorization code, redirect back to OTS',
			},
		],
		actors: {
			browser: true,
			ots: false,
			entra: true,
			okta: false,
		},
	},
	{
		id: 4,
		title: 'OTS exchanges the code and verifies the realm',
		userSees: 'loading',
		urlBar: 'https://secrets.example.com/auth/callback?code=0.AR8AnSqjO3vZ...&state=xYz9Kp2mN7qR4sT1',
		description:
			'OTS validates state, exchanges the code server-to-server, and validates the ID token as usual. Then comes the check discovery makes essential: the response must come from the issuer and tenant selected for this transaction. Everything in that check is read from the validated token, not from the sign-in form. Access is then decided from the tenant-qualified subject and Contoso’s account-assignment or provisioning policy; a matching email domain is not proof of membership.',
		securityNote:
			'This is the core multi-IdP invariant: the domain typed in the box only selects an IdP. Bind the pending auth state to that selection and verify iss and tid (OIDC) or Issuer/entityID (SAML) against it on every callback. Then authorize the stable subject through an explicit account mapping, tenant assignment, or provisioning record. Do not authorize from email or preferred_username: those claims are mutable, and Entra guest users may legitimately have identifiers outside the tenant’s vanity domain.',
		http: [
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Validate state parameter',
				note: 'state matches pending auth started in step 2; pending state carries realm=contoso.com and the code_verifier.',
			},
			{
				type: 'server',
				from: 'OTS',
				to: 'Entra',
				label: 'Server-to-server token exchange',
				method: 'POST',
				url: 'https://login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/token',
				headers: ['Content-Type: application/x-www-form-urlencoded'],
				body: 'grant_type=authorization_code\n&code=0.AR8AnSqjO3vZ...\n&client_id=8f3a2b1c-9d4e-4f5a-b6c7-1a2b3c4d5e6f\n&client_secret=Q3x8~...\n&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk\n&redirect_uri=https://secrets.example.com/auth/callback',
			},
			{
				type: 'server-response',
				from: 'Entra',
				to: 'OTS',
				status: '200 OK',
				body: '{\n  "token_type": "Bearer",\n  "expires_in": 3599,\n  "access_token": "eyJ0eXAiOiJKV1Qi...",\n  "id_token": "eyJhbGciOiJSUzI1NiIs..."\n}',
				expandedPayload: {
					label: 'Decoded id_token (key claims)',
					content: `{
  "iss": "https://login.microsoftonline.com/3b2a1c9d-8e7f-4a65-b4c3-d2e1f0a9b8c7/v2.0",
  "aud": "8f3a2b1c-9d4e-4f5a-b6c7-1a2b3c4d5e6f",
  "tid": "3b2a1c9d-8e7f-4a65-b4c3-d2e1f0a9b8c7",
  "oid": "5d1e8f3a-2b4c-4d6e-9f0a-1b2c3d4e5f6a",
  "preferred_username": "alice@contoso.com",
  "name": "Alice Smith",
  "nonce": "aB3cD5eF7gH9iJ1k",
  "ver": "2.0"
}`,
				},
			},
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Validate token + realm binding',
				note: 'Signature, iss, aud, exp, nonce all valid. Realm check: iss and tid 3b2a1c9d... match the Entra tenant selected for the pending transaction. Account key: (tid 3b2a1c9d..., oid 5d1e8f3a...), a tenant-qualified subject that Contoso has assigned or provisioned for access. preferred_username and email are display attributes only; neither their value nor the domain typed in step 2 grants access.',
			},
			{
				type: 'response',
				from: 'OTS',
				to: 'Browser',
				status: '302 Found',
				headers: [
					'Location: https://secrets.example.com/dashboard',
					'Set-Cookie: _ots_session=encrypted-session-data; HttpOnly; Secure; SameSite=Lax; Path=/',
					'Set-Cookie: _ots_realm=contoso.com; Secure; SameSite=Lax; Path=/signin; Max-Age=2592000',
				],
				note: 'Session created; a realm hint cookie is also set so the next visit can skip the email prompt',
			},
		],
		actors: {
			browser: true,
			ots: true,
			entra: true,
			okta: false,
		},
	},
	{
		id: 5,
		title: 'Alice reaches her dashboard',
		userSees: 'dashboard',
		urlBar: 'https://secrets.example.com/dashboard',
		description:
			'Alice is signed in. On her next visit, the _ots_realm hint cookie lets OTS offer "Continue with Contoso SSO" immediately instead of asking for her email again -- discovery is a one-time cost per browser.',
		securityNote:
			'The realm hint cookie is a UX optimization, never an authentication input: it pre-selects a button, and the user must keep a way to override it ("Sign in to a different organization"). Auto-redirecting on the hint alone invites login loops and traps users whose org has changed IdPs.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'OTS',
				method: 'GET',
				url: 'https://secrets.example.com/dashboard',
				headers: ['Cookie: _ots_session=encrypted-session-data'],
			},
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Decrypt session cookie',
				note: 'User: alice@contoso.com, realm contoso.com, authenticated via Entra ID (OIDC)',
			},
			{
				type: 'response',
				from: 'OTS',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: text/html'],
				note: 'Dashboard rendered for Alice',
			},
		],
		actors: {
			browser: true,
			ots: true,
			entra: false,
			okta: false,
		},
	},
	{
		id: 6,
		title: 'Bob from Acme hits the same page',
		userSees: 'signin-bob',
		urlBar: 'https://secrets.example.com/signin',
		description:
			"A different user in a different browser: Bob types bob@acme.com into the same form. This time the registry maps acme.com to Acme's Okta org -- a different vendor and a different protocol. OTS generates a SAML AuthnRequest instead of an OIDC redirect and sends Bob to acme.okta.com.",
		securityNote:
			'Discovery decouples who is signing in from how they prove it. The registry entry pins everything about the realm: protocol, endpoints, entity IDs, and signing certificates, all captured when Acme onboarded. The email domain selects the entry; the entry dictates the entire trust configuration.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'OTS',
				method: 'POST',
				url: 'https://secrets.example.com/auth/discover',
				headers: ['Content-Type: application/x-www-form-urlencoded'],
				body: 'email=bob%40acme.com',
			},
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Home-realm lookup',
				note: 'Domain acme.com -> Okta (SAML 2.0), org acme.okta.com, entityID http://www.okta.com/exk9876. Generate AuthnRequest with unique ID _request_bob42 and NameIDPolicy Format=urn:oasis:names:tc:SAML:2.0:nameid-format:persistent, store it for InResponseTo validation, record realm=acme.com in pending auth state, set RelayState=/dashboard.',
			},
			{
				type: 'response',
				from: 'OTS',
				to: 'Browser',
				status: '302 Found',
				headers: [
					'Location: https://acme.okta.com/app/ots-saml/exk9876/sso/saml?',
					'  SAMLRequest=base64-deflate-encoded-xml',
					'  &RelayState=%2Fdashboard',
					'  &SigAlg=http://www.w3.org/2001/04/xmldsig-more%23rsa-sha256',
					'  &Signature=base64-encoded-signature',
				],
				note: "HTTP-Redirect binding to Acme's Okta org -- same discovery endpoint, entirely different protocol than Alice's flow",
			},
		],
		actors: {
			browser: true,
			ots: true,
			entra: false,
			okta: false,
		},
	},
	{
		id: 7,
		title: 'Bob authenticates at Okta; assertion POSTs back',
		userSees: 'okta-login-bob',
		urlBar: 'https://acme.okta.com/app/ots-saml/exk9876/sso/saml',
		description:
			"Bob signs in under Acme's Okta policies. This reconstructed Classic Engine trace first returns a one-time sessionToken, redeems it for an Okta browser session, and then returns an auto-submitting form that POSTs a signed SAML assertion to OTS's ACS endpoint. Identity Engine hosted login uses a different IDX sequence. OTS runs the full SAML validation stack (see the SP-initiated SAML demo), plus the same realm-binding check Alice's flow needed: the assertion must come from the entityID registered for acme.com. The NameID here is an opaque persistent identifier, so the email address travels as an ordinary attribute and never acts as the key.",
		securityNote:
			"The ACS endpoint accepts assertions from every registered IdP, so issuer pinning is what keeps realms apart: the Issuer entityID and signing certificate must match the IdP bound to the pending request's realm. An assertion signed by Contoso's IdP but carrying an acme.com email attribute must be rejected on the issuer check alone, however valid its signature is. Note that a persistent NameID is only unique within its issuer: two IdPs can emit the same opaque string, which is why the account key is the pair (entityID, NameID) and never the NameID by itself.",
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'Okta',
				method: 'POST',
				url: 'https://acme.okta.com/api/v1/authn',
				headers: ['Content-Type: application/json'],
				body: '{\n  "username": "bob@acme.com",\n  "password": "********"\n}',
				note: 'Credentials submitted to the Classic Engine Authentication API. An Identity Engine org uses its hosted IDX flow instead.',
			},
			{
				type: 'response',
				from: 'Okta',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: application/json'],
				body: '{\n  "status": "SUCCESS",\n  "sessionToken": "20111..."\n}',
				note: 'Authentication succeeded, but no browser session exists yet. sessionToken is a one-time credential, not a cookie.',
			},
			{
				type: 'request',
				from: 'Browser',
				to: 'Okta',
				method: 'GET',
				url: 'https://acme.okta.com/login/sessionCookieRedirect?token=20111...&redirectUrl=https%3A%2F%2Facme.okta.com%2Fapp%2Fots-saml%2Fexk9876%2Fsso%2Fsaml%3FSAMLRequest%3D...%26RelayState%3D%252Fdashboard',
				headers: ['Cookie: (no Okta session)'],
				note: 'Redeem the sessionToken and preserve the original SAMLRequest and RelayState in the trusted redirectUrl.',
			},
			{
				type: 'response',
				from: 'Okta',
				to: 'Browser',
				status: '302 Found',
				headers: [
					'Set-Cookie: sid=okta_session_bob; HttpOnly; Secure; SameSite=None',
					'Location: https://acme.okta.com/app/ots-saml/exk9876/sso/saml?SAMLRequest=...&RelayState=%2Fdashboard',
				],
				note: 'Okta browser session established. Cookie name and attributes vary by org and browser context.',
			},
			{
				type: 'request',
				from: 'Browser',
				to: 'Okta',
				method: 'GET',
				url: 'https://acme.okta.com/app/ots-saml/exk9876/sso/saml?SAMLRequest=...&RelayState=%2Fdashboard',
				headers: ['Cookie: sid=okta_session_bob'],
				note: 'Return to the original SP-initiated SAML request with an Okta session.',
			},
			{
				type: 'response',
				from: 'Okta',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: text/html'],
				body: `<form method="POST" action="https://secrets.example.com/saml/acs">
  <input type="hidden" name="SAMLResponse" value="PHNhbWxwOlJlc3Bv...base64..."/>
  <input type="hidden" name="RelayState" value="/dashboard"/>
</form>`,
				note: 'Auto-submit form with the signed SAML Response (HTTP-POST binding)',
			},
			{
				type: 'request',
				from: 'Browser',
				to: 'OTS',
				method: 'POST',
				url: 'https://secrets.example.com/saml/acs',
				headers: ['Content-Type: application/x-www-form-urlencoded', 'Origin: https://acme.okta.com'],
				body: 'SAMLResponse=PHNhbWxw...&RelayState=%2Fdashboard',
				expandedPayload: {
					label: 'Decoded SAMLResponse (abridged)',
					content: `<samlp:Response ID="_response_bob88" InResponseTo="_request_bob42"
  Destination="https://secrets.example.com/saml/acs">
  <saml:Issuer>http://www.okta.com/exk9876</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion ID="_assertion_bob77">
    <saml:Issuer>http://www.okta.com/exk9876</saml:Issuer>
    <ds:Signature><!-- RSA-SHA256, Acme's Okta certificate --></ds:Signature>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">
        7f3d1a90-4c2b-4e18-9a55-0c6d2b8e41af
      </saml:NameID>
      <saml:SubjectConfirmationData InResponseTo="_request_bob42"
        Recipient="https://secrets.example.com/saml/acs"/>
    </saml:Subject>
    <saml:Conditions>
      <saml:AudienceRestriction>
        <saml:Audience>https://secrets.example.com/saml/metadata</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AttributeStatement>
      <saml:Attribute Name="email">
        <saml:AttributeValue>bob@acme.com</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="displayName">
        <saml:AttributeValue>Bob Jones</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`,
				},
			},
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Validate assertion + realm binding',
				note: "Signatures verify against Acme's Okta certificate, InResponseTo matches _request_bob42, audience and recipient are correct, and the assertion ID is unseen. Realm check: Issuer http://www.okta.com/exk9876 is the entityID selected for this pending transaction. Account key: (http://www.okta.com/exk9876, 7f3d1a90-...), the entityID plus the persistent NameID, resolved through Acme's assignment or provisioning record. email is profile data only and does not establish realm membership or access.",
			},
			{
				type: 'response',
				from: 'OTS',
				to: 'Browser',
				status: '302 Found',
				headers: [
					'Location: https://secrets.example.com/dashboard',
					'Set-Cookie: _ots_session=encrypted-session-data; HttpOnly; Secure; SameSite=Lax; Path=/',
					'Set-Cookie: _ots_realm=acme.com; Secure; SameSite=Lax; Path=/signin; Max-Age=2592000',
				],
				note: 'Session created from SAML attributes, redirect via RelayState',
			},
		],
		actors: {
			browser: true,
			ots: true,
			entra: false,
			okta: true,
		},
	},
	{
		id: 8,
		title: 'Same app, different realms',
		userSees: 'dashboard-bob',
		urlBar: 'https://secrets.example.com/dashboard',
		description:
			'Bob lands on the same dashboard Alice uses. Her session was minted from an OIDC ID token, his from a SAML assertion -- past the session layer, the application cannot tell and does not care. Discovery plus per-realm IdP configuration confines all protocol differences to the auth module.',
		securityNote:
			'Account linking discipline is what makes this safe long-term: key user records on (issuer, subject) -- (tid, oid) for Entra, (entityID, persistent NameID) for Okta -- never on an email address or an email-form NameID, both of which the IdP can change under you. Cross-tenant impersonation is prevented only while the SP does both halves: binds the account to that pair and re-checks the issuer or tenant on every assertion. Drop the issuer half and an attacker who controls IdP B can assert a subject or email that collides with a user of IdP A and land in that account.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'OTS',
				method: 'GET',
				url: 'https://secrets.example.com/dashboard',
				headers: ['Cookie: _ots_session=encrypted-session-data'],
			},
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Decrypt session cookie',
				note: 'User: bob@acme.com, realm acme.com, authenticated via Okta (SAML 2.0)',
			},
			{
				type: 'response',
				from: 'OTS',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: text/html'],
				note: 'Same dashboard code path as Alice -- identity provenance lives only in the session record',
			},
		],
		actors: {
			browser: true,
			ots: true,
			entra: false,
			okta: false,
		},
	},
];
