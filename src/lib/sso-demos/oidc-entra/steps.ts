// src/lib/sso-demos/oidc-entra/steps.ts

import type { Step } from '$lib/sso-demos';

/**
 * OAuth2 Authorization Code flow with PKCE and Microsoft Entra ID as the
 * OIDC Provider, against a workforce tenant (contoso.onmicrosoft.com).
 *
 * The wire protocol is nearly identical to the Google social login demo --
 * that is the point. What changes is everything around it: tenant-scoped
 * endpoints instead of a global authorization server, admin consent instead
 * of a per-user consent screen, Conditional Access policies evaluated at
 * sign-in, and enterprise claims (tid, oid) that replace email as the
 * stable identity key.
 */
export const STEPS: Step[] = [
	{
		id: 1,
		title: 'User clicks Sign in with Microsoft',
		userSees: 'blank',
		urlBar: 'https://secrets.example.com/dashboard',
		description:
			"User navigates to the OTS dashboard or clicks 'Sign in with Microsoft'. OTS finds no session, generates PKCE parameters, state, and nonce, then redirects to the authorization endpoint of Contoso's tenant -- not a global Microsoft endpoint. The tenant is part of the URL.",
		securityNote:
			'Entra endpoints are tenant-scoped: /contoso.onmicrosoft.com/ (or the tenant GUID) accepts only Contoso accounts, /organizations/ accepts any work account, and /common/ additionally accepts personal Microsoft accounts. A single-tenant app should hardcode its tenant in the authorize URL and later verify the tid claim -- accepting tokens from /common/ without issuer validation is a classic multi-tenant vulnerability.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'OTS',
				method: 'GET',
				url: 'https://secrets.example.com/dashboard',
				headers: ['Cookie: (none)'],
				note: 'No session cookie present',
			},
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Generate OAuth2 parameters',
				note: 'Generate code_verifier, compute code_challenge = BASE64URL(SHA256(code_verifier)), generate random state and nonce. Store all three server-side keyed by session.',
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
					'  &response_mode=query',
					'  &scope=openid profile email offline_access',
					'  &state=xYz9Kp2mN7qR4sT1',
					'  &nonce=aB3cD5eF7gH9iJ1k',
					'  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
					'  &code_challenge_method=S256',
				],
				note: 'Redirect to the tenant-scoped authorize endpoint with PKCE challenge, state, and nonce. offline_access requests a refresh token.',
			},
		],
		actors: {
			browser: true,
			ots: true,
			entra: false,
		},
	},
	{
		id: 2,
		title: 'Browser arrives at Entra sign-in',
		userSees: 'entra-login',
		urlBar: 'https://login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/authorize?client_id=...',
		description:
			'Browser follows the redirect to Entra. Because a Contoso admin registered OTS as an enterprise application and granted admin consent for the requested scopes, Alice never sees a consent screen -- just the familiar Microsoft sign-in page for her organization.',
		securityNote:
			"This is the biggest UX difference from consumer OAuth: Google asks each user to approve scopes; Entra tenants typically pre-authorize them via admin consent, and many tenants block user consent entirely. Entra still validates that redirect_uri exactly matches a URI registered on the app registration -- same rule as Google, same reason: preventing authorization code theft.",
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'Entra',
				method: 'GET',
				url: 'https://login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/authorize?client_id=8f3a2b1c-9d4e-4f5a-b6c7-1a2b3c4d5e6f&redirect_uri=...&response_type=code&scope=openid+profile+email+offline_access&state=xYz9Kp2mN7qR4sT1&nonce=aB3cD5eF7gH9iJ1k&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256',
				headers: [],
			},
			{
				type: 'internal',
				from: 'Entra',
				to: 'Entra',
				label: 'Resolve app + consent check',
				note: 'App registration 8f3a2b1c... found in tenant. Admin consent already granted for openid, profile, email, offline_access -- no consent prompt will be shown.',
			},
			{
				type: 'response',
				from: 'Entra',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: text/html', 'Set-Cookie: ESTSWEBSESSION=...; HttpOnly; Secure; SameSite=None'],
				note: 'Microsoft sign-in page rendered (skipped entirely if Alice already has an Entra session cookie)',
			},
		],
		actors: {
			browser: true,
			ots: false,
			entra: true,
		},
	},
	{
		id: 3,
		title: 'User authenticates, Conditional Access evaluates',
		userSees: 'entra-login',
		urlBar: 'https://login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/authorize?client_id=...',
		description:
			"Alice enters her Contoso credentials. Entra validates them and evaluates Conditional Access policies -- MFA, device compliance, network location -- before issuing anything. On success, it redirects the browser back to OTS's callback with a single-use authorization code and the original state.",
		securityNote:
			'Conditional Access runs at token issuance, invisible to the application. OTS cannot tell whether Alice used a password + Authenticator prompt, a passkey, or certificate auth -- and usually should not care. If it does care (step-up auth), it can request specific authentication context via the claims parameter and verify the acrs claim in the resulting token.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'Entra',
				method: 'POST',
				url: 'https://login.microsoftonline.com/contoso.onmicrosoft.com/login',
				headers: ['Content-Type: application/x-www-form-urlencoded', 'Cookie: ESTSWEBSESSION=...'],
				body: 'login=alice%40contoso.com&passwd=********&ctx=...&flowToken=...',
				note: 'Credentials submitted; Conditional Access may insert an MFA challenge here',
			},
			{
				type: 'internal',
				from: 'Entra',
				to: 'Entra',
				label: 'Evaluate Conditional Access',
				note: 'Policies for Contoso: require MFA for all users, require compliant device for admins. Alice satisfies both. Issue single-use authorization code bound to the PKCE challenge.',
			},
			{
				type: 'response',
				from: 'Entra',
				to: 'Browser',
				status: '302 Found',
				headers: ['Location: https://secrets.example.com/auth/callback?code=0.AR8AnSqjO3vZ...&state=xYz9Kp2mN7qR4sT1'],
				note: 'Authorization code issued, redirect back to OTS with state for CSRF validation',
			},
		],
		actors: {
			browser: true,
			ots: false,
			entra: true,
		},
	},
	{
		id: 4,
		title: 'OTS exchanges code for tokens (back-channel)',
		userSees: 'loading',
		urlBar: 'https://secrets.example.com/auth/callback?code=0.AR8AnSqjO3vZ...&state=xYz9Kp2mN7qR4sT1',
		description:
			"Browser follows the redirect back to OTS. OTS validates the state parameter, then exchanges the authorization code at the tenant's token endpoint via a server-to-server POST, presenting both its client credential and the PKCE code_verifier.",
		securityNote:
			'Entra confidential clients can authenticate with a client_secret, a certificate, or -- best practice for workloads running in Azure, GitHub Actions, or Kubernetes -- federated credentials (workload identity), which eliminate stored secrets entirely. The PKCE verifier is checked in addition to client authentication, exactly as in the Google flow.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'OTS',
				method: 'GET',
				url: 'https://secrets.example.com/auth/callback?code=0.AR8AnSqjO3vZ...&state=xYz9Kp2mN7qR4sT1',
				headers: [],
			},
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Validate state parameter',
				note: 'Confirm state=xYz9Kp2mN7qR4sT1 matches the value stored in step 1. Retrieve code_verifier from server-side session.',
			},
			{
				type: 'server',
				from: 'OTS',
				to: 'Entra',
				label: 'Server-to-server token exchange',
				method: 'POST',
				url: 'https://login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/token',
				headers: ['Content-Type: application/x-www-form-urlencoded'],
				body: 'grant_type=authorization_code\n&code=0.AR8AnSqjO3vZ...\n&redirect_uri=https://secrets.example.com/auth/callback\n&client_id=8f3a2b1c-9d4e-4f5a-b6c7-1a2b3c4d5e6f\n&client_secret=Q3x8~...\n&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
				note: 'Browser never sees this request. code_verifier proves PKCE ownership.',
			},
			{
				type: 'server-response',
				from: 'Entra',
				to: 'OTS',
				status: '200 OK',
				body: `{
  "token_type": "Bearer",
  "scope": "openid profile email",
  "expires_in": 3599,
  "ext_expires_in": 3599,
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs...",
  "refresh_token": "0.AR8AnSqjO3vZbUOxk2Yl...",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}`,
				expandedPayload: {
					label: 'Decoded id_token (JWT)',
					content: `// Header
{
  "alg": "RS256",
  "kid": "9GmnyFPkhc3hOuR22mvSvgnLo7Y",
  "typ": "JWT"
}

// Payload
{
  "iss": "https://login.microsoftonline.com/3b2a1c9d-8e7f-4a65-b4c3-d2e1f0a9b8c7/v2.0",
  "aud": "8f3a2b1c-9d4e-4f5a-b6c7-1a2b3c4d5e6f",
  "sub": "AAAAAAAAAAAAAAAAAAAAAIkzqFVrSaSaFHy782bbtaQ",
  "tid": "3b2a1c9d-8e7f-4a65-b4c3-d2e1f0a9b8c7",
  "oid": "5d1e8f3a-2b4c-4d6e-9f0a-1b2c3d4e5f6a",
  "preferred_username": "alice@contoso.com",
  "email": "alice@contoso.com",
  "name": "Alice Smith",
  "nonce": "aB3cD5eF7gH9iJ1k",
  "ver": "2.0",
  "iat": 1705320060,
  "nbf": 1705320060,
  "exp": 1705323960
}

// Signature: RS256 signed with the tenant's current signing key
// Verify with JWKS: https://login.microsoftonline.com/contoso.onmicrosoft.com/discovery/v2.0/keys`,
				},
				note: 'Note the Entra-specific claims: tid (tenant), oid (directory object id), and a pairwise sub. ext_expires_in allows token reuse during Entra outages.',
			},
		],
		actors: {
			browser: true,
			ots: true,
			entra: true,
		},
	},
	{
		id: 5,
		title: 'OTS validates ID token and maps identity',
		userSees: 'loading',
		urlBar: 'https://secrets.example.com/auth/callback?code=0.AR8AnSqjO3vZ...&state=xYz9Kp2mN7qR4sT1',
		description:
			"OTS validates the ID token (signature, issuer, audience, nonce, expiry) against the tenant's JWKS, then maps the user to a local account keyed on tid + oid -- not email. Optionally it calls the Microsoft Graph userinfo endpoint for extra profile data.",
		securityNote:
			"Key the account on tid + oid, never on the email claim. In Entra, sub is pairwise (different per application, useless across apps), and email/preferred_username are admin-editable and not guaranteed verified -- the root cause of the 'nOAuth' account-takeover pattern, where a rogue tenant admin sets a victim's email on their own user. tid + oid is the only cross-app-stable, tenant-anchored identifier.",
		http: [
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Validate ID token JWT',
				note: 'Verify RS256 signature via tenant JWKS, check iss contains expected tid 3b2a1c9d..., aud matches client_id, exp in future, nonce=aB3cD5eF7gH9iJ1k. Map account key: (tid, oid) = (3b2a1c9d..., 5d1e8f3a...).',
			},
			{
				type: 'server',
				from: 'OTS',
				to: 'Entra',
				label: 'Fetch additional profile data',
				method: 'GET',
				url: 'https://graph.microsoft.com/oidc/userinfo',
				headers: ['Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGci...'],
				note: 'Optional: the OIDC userinfo endpoint lives on Microsoft Graph, not login.microsoftonline.com',
			},
			{
				type: 'server-response',
				from: 'Entra',
				to: 'OTS',
				status: '200 OK',
				body: `{
  "sub": "AAAAAAAAAAAAAAAAAAAAAIkzqFVrSaSaFHy782bbtaQ",
  "name": "Alice Smith",
  "given_name": "Alice",
  "family_name": "Smith",
  "email": "alice@contoso.com",
  "picture": "https://graph.microsoft.com/v1.0/me/photo/$value"
}`,
				note: 'Userinfo response; richer directory data (groups, manager, jobTitle) requires Graph API scopes',
			},
			{
				type: 'response',
				from: 'OTS',
				to: 'Browser',
				status: '302 Found',
				headers: [
					'Location: https://secrets.example.com/dashboard',
					'Set-Cookie: _ots_session=encrypted-session-data; HttpOnly; Secure; SameSite=Lax; Path=/',
				],
				note: 'Session created from OIDC claims, redirect to original destination',
			},
		],
		actors: {
			browser: true,
			ots: true,
			entra: true,
		},
	},
	{
		id: 6,
		title: 'User reaches authenticated dashboard',
		userSees: 'dashboard',
		urlBar: 'https://secrets.example.com/dashboard',
		description:
			'Alice is authenticated and reaches her dashboard. OTS reads the session to render content personalized with the Entra profile data (name, email, avatar via Graph).',
		securityNote:
			'The access_token and refresh_token stay server-side. Entra refresh tokens are long-lived but revocable: disabling the user, a password reset, or a Conditional Access change can invalidate them. Handle AADSTS50173 (token revoked) by re-running the authorization flow, not by retrying.',
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
				note: 'Extract user identity: alice@contoso.com (tid 3b2a1c9d..., oid 5d1e8f3a...)',
			},
			{
				type: 'response',
				from: 'OTS',
				to: 'Browser',
				status: '200 OK',
				headers: [
					'Content-Type: text/html',
					"Content-Security-Policy: default-src 'self'",
					'X-Content-Type-Options: nosniff',
				],
				note: 'Dashboard rendered with user context from Entra OIDC claims',
			},
		],
		actors: {
			browser: true,
			ots: true,
			entra: false,
		},
	},
	{
		id: 7,
		title: 'Subsequent requests use session cookie',
		userSees: 'dashboard',
		urlBar: 'https://secrets.example.com/dashboard',
		description:
			'All future requests use the session cookie; no Entra interaction until the session expires or Alice signs out. When Contoso offboards Alice, disabling her Entra account blocks new sign-ins -- but the OTS session lives until it expires, which is why enterprises pair SSO with SCIM deprovisioning.',
		securityNote:
			'Session lifetime is a local decision, decoupled from Entra token expiry. For high-value apps, Continuous Access Evaluation (CAE) lets Entra push near-real-time revocation to cooperating resource servers; for everything else, keep sessions short and re-validate with a silent token refresh. See the SCIM demo for the deprovisioning half of the lifecycle.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'OTS',
				method: 'GET',
				url: 'https://secrets.example.com/api/secrets',
				headers: ['Cookie: _ots_session=encrypted-session-data', 'Accept: application/json'],
			},
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Validate session (fast path)',
				note: 'Session valid, no Entra interaction needed. User: alice@contoso.com',
			},
			{
				type: 'response',
				from: 'OTS',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: application/json'],
				body: '{"secrets": [...], "user": "alice@contoso.com"}',
				note: 'Normal API response, no OAuth2 roundtrip needed',
			},
		],
		actors: {
			browser: true,
			ots: true,
			entra: false,
		},
	},
];
