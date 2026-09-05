// src/lib/sso-demos/sp-saml-okta/steps.ts

import type { Step } from '$lib/sso-demos';

/**
 * SP-initiated SAML flow with Okta as the IdP.
 *
 * The user visits OTS (the Service Provider), which redirects to Okta
 * (the Identity Provider) via a SAML AuthnRequest. After authentication,
 * Okta posts a signed SAML assertion back to OTS's ACS endpoint.
 *
 * This is the most common enterprise SSO pattern: direct SAML between
 * application and IdP, no intermediate broker or protocol bridge.
 *
 * Bindings:
 *   AuthnRequest  -> HTTP-Redirect (deflated, base64, URL-encoded in query string)
 *   SAMLResponse  -> HTTP-POST (base64-encoded in auto-submit form)
 *
 * The HTTP traces below are reconstructed examples, not packet captures.
 * The SAML messages follow the specification, but cookie names, endpoint
 * paths, redirect chains, and response bodies on the Okta side vary by
 * org configuration and product version.
 */
export const STEPS: Step[] = [
	{
		id: 1,
		title: 'User requests protected resource',
		userSees: 'blank',
		urlBar: 'https://secrets.example.com/dashboard',
		description:
			'User navigates to the OTS dashboard. OTS checks for a valid session and finds none, so it generates a SAML AuthnRequest with a unique ID and redirects the browser to Okta.',
		securityNote:
			'SP-initiated SAML requires the SP to generate a fresh AuthnRequest with a unique ID for each login attempt. The ID must be stored server-side and later matched against InResponseTo in the SAML Response, preventing unsolicited response injection. The RelayState parameter preserves the deep link so the user lands on the correct page after authentication.',
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
				label: 'Session check + AuthnRequest generation',
				note: 'No valid session found. Generate AuthnRequest with unique ID (_request_abc123), store ID for InResponseTo validation, set RelayState to /dashboard.',
			},
			{
				type: 'response',
				from: 'OTS',
				to: 'Browser',
				status: '302 Found',
				headers: [
					'Location: https://contoso.okta.com/app/ots-saml/exk1234/sso/saml?',
					'  SAMLRequest=base64-deflate-encoded-xml',
					'  &RelayState=%2Fdashboard',
					'  &SigAlg=http://www.w3.org/2001/04/xmldsig-more%23rsa-sha256',
					'  &Signature=base64-encoded-signature',
				],
				note: 'HTTP-Redirect binding: AuthnRequest is deflated, base64-encoded, and URL-encoded. Signature covers SAMLRequest + RelayState + SigAlg concatenated.',
			},
		],
		actors: {
			browser: true,
			ots: true,
			okta: false,
		},
	},
	{
		id: 2,
		title: 'Browser follows redirect to Okta',
		userSees: 'okta-login',
		urlBar: 'https://contoso.okta.com/app/ots-saml/exk1234/sso/saml',
		description:
			'Browser follows the redirect to Okta, carrying the SAML AuthnRequest as a query parameter. Okta validates the request signature, checks the Destination and Issuer, and presents its login page.',
		securityNote:
			"The HTTP-Redirect binding encodes the AuthnRequest as a deflated, base64-encoded query parameter. When the SP signs the request, the signature covers the SAMLRequest, RelayState, and SigAlg parameters concatenated per the SAML binding spec. Okta validates this signature against the SP's public certificate registered in its SAML app configuration.",
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'Okta',
				method: 'GET',
				url: 'https://contoso.okta.com/app/ots-saml/exk1234/sso/saml?SAMLRequest=...&RelayState=%2Fdashboard&SigAlg=...&Signature=...',
				headers: [],
				expandedPayload: {
					label: 'Decoded SAMLRequest (AuthnRequest)',
					content: `<samlp:AuthnRequest
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="_request_abc123"
  Version="2.0"
  IssueInstant="2024-01-15T10:30:00Z"
  Destination="https://contoso.okta.com/app/ots-saml/exk1234/sso/saml"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
  AssertionConsumerServiceURL="https://secrets.example.com/saml/acs"
  ForceAuthn="false"
  IsPassive="false">
  <saml:Issuer>https://secrets.example.com/saml/metadata</saml:Issuer>
  <samlp:NameIDPolicy
    Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
    AllowCreate="true"/>
  <samlp:RequestedAuthnContext Comparison="exact">
    <saml:AuthnContextClassRef>
      urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
    </saml:AuthnContextClassRef>
  </samlp:RequestedAuthnContext>
</samlp:AuthnRequest>`,
				},
			},
			{
				type: 'internal',
				from: 'Okta',
				to: 'Okta',
				label: 'Validate AuthnRequest',
				note: 'Verify SP signature, confirm Destination URL matches this endpoint, validate Issuer is a registered SP, check ACS URL is whitelisted in the SAML app configuration.',
			},
			{
				type: 'response',
				from: 'Okta',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: text/html'],
				note: 'Okta login page rendered (or auto-proceeds if an Okta session cookie is already present). No session cookie is set yet: the user has not authenticated.',
			},
		],
		actors: {
			browser: true,
			ots: false,
			okta: true,
		},
	},
	// Classic Engine /api/v1/authn + sessionCookieRedirect trace, split across steps 3 and 4.
	// idp-saml-okta/steps.ts (step 2) and multi-idp-discovery/steps.ts (Bob's Okta step) carry
	// the same explanation and IDX caveat; edit all three together.
	{
		id: 3,
		title: 'User authenticates with Okta',
		userSees: 'okta-login',
		urlBar: 'https://contoso.okta.com/app/ots-saml/exk1234/sso/saml',
		description:
			"User enters credentials at Okta. Okta validates the credentials and may prompt for MFA based on the application's sign-on policy. The exchange shown here is the Classic Engine Authentication API (/api/v1/authn), which returns a one-time sessionToken. Identity Engine hosted login does not use it: it runs an Interaction Code (IDX) sequence over /oauth2/v1/interact and /idp/idx/*, with the credential and factor steps driven by remediation objects. The demo keeps the Classic trace because it is the shortest legible illustration of credentials in, session out. The SAML legs on either side of it are identical under both engines.",
		securityNote:
			'Okta sign-on policies can enforce MFA, device trust, network zones, and risk-based authentication per application. The SP has no visibility into these IdP-side steps -- it only receives the final signed assertion. If the user has an existing Okta session, this step and the next one are skipped entirely.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'Okta',
				method: 'POST',
				url: 'https://contoso.okta.com/api/v1/authn',
				headers: ['Content-Type: application/json', 'Cookie: (no Okta session)'],
				body: '{\n  "username": "alice@contoso.com",\n  "password": "********"\n}',
				note: 'Credentials submitted to the Classic Engine Authentication API. Illustrative: an Identity Engine org reaches the same outcome through the IDX endpoints instead.',
			},
			{
				type: 'response',
				from: 'Okta',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: application/json'],
				body: '{\n  "status": "SUCCESS",\n  "sessionToken": "20111..."\n}',
				note: 'Authentication successful; may return MFA_REQUIRED if step-up auth is enforced. Note what is not here: no Set-Cookie. A sessionToken is not yet a browser session.',
			},
		],
		actors: {
			browser: true,
			ots: false,
			okta: true,
		},
	},
	{
		id: 4,
		title: 'sessionToken is exchanged for an Okta session cookie',
		userSees: 'loading',
		urlBar: 'https://contoso.okta.com/login/sessionCookieRedirect',
		description:
			'The sessionToken from the previous step is a single-use bearer credential, not a session. It has to be redeemed at Okta for a browser session cookie before the SAML endpoint will recognise the user. Okta documents two ways to do this: a redirect through /login/sessionCookieRedirect with token and redirectUrl, and an OIDC /oauth2/v1/authorize call carrying sessionToken with prompt=none. Both set the sid cookie and then send the browser on to the target URL. Here the trusted redirectUrl preserves the original SAMLRequest and RelayState; dropping them would turn the return into a new launch rather than completing the SP-initiated transaction.',
		securityNote:
			'The sessionToken is consumed on first use and is invalidated on logout, so a leaked token is only useful inside a narrow window. The redirectUrl must be a Trusted Origin in the Okta org, otherwise this endpoint is an open redirect that hands a session-establishing token to an attacker-chosen destination. Classic Engine orgs ignore sessionToken when a session cookie is already present, which is why this step disappears entirely for a user who is already signed in.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'Okta',
				method: 'GET',
				url: 'https://contoso.okta.com/login/sessionCookieRedirect?token=20111...&redirectUrl=https%3A%2F%2Fcontoso.okta.com%2Fapp%2Fots-saml%2Fexk1234%2Fsso%2Fsaml%3FSAMLRequest%3D...%26RelayState%3D%252Fdashboard',
				headers: ['Cookie: (no Okta session)'],
				note: 'Redeem the one-time sessionToken and preserve the original SAMLRequest in redirectUrl. The OIDC alternative is /oauth2/v1/authorize?...&prompt=none&sessionToken=20111..., which sets the same cookie.',
			},
			{
				type: 'response',
				from: 'Okta',
				to: 'Browser',
				status: '302 Found',
				headers: [
					'Set-Cookie: sid=okta_session_abc; HttpOnly; Secure; SameSite=None',
					'Location: https://contoso.okta.com/app/ots-saml/exk1234/sso/saml?SAMLRequest=...&RelayState=%2Fdashboard',
				],
				note: 'Okta session established. Cookie name and attributes are shown as a reconstructed example; the actual set varies by org. The browser now returns to the SAML SSO endpoint with a session in hand.',
			},
		],
		actors: {
			browser: true,
			ots: false,
			okta: true,
		},
	},
	{
		id: 5,
		title: 'Okta issues SAML Response',
		userSees: 'loading',
		urlBar: 'https://contoso.okta.com/app/ots-saml/exk1234/sso/saml',
		description:
			"The browser is back at the SAML SSO endpoint, now carrying the sid cookie. Okta recognises the session, matches it against the pending AuthnRequest, and generates a signed SAML Response containing the assertion with the user's identity and attributes. It returns an auto-submitting HTML form that POSTs the response to the SP's ACS endpoint (HTTP-POST binding).",
		securityNote:
			"Okta signs both the SAML Response envelope and the inner Assertion with its private key (RSA-SHA256). Signing both layers prevents an attacker from wrapping a legitimate assertion inside a forged response. The SP must validate signatures at both levels against Okta's X.509 certificate from metadata.",
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'Okta',
				method: 'GET',
				url: 'https://contoso.okta.com/app/ots-saml/exk1234/sso/saml?SAMLRequest=...&RelayState=%2Fdashboard',
				headers: ['Cookie: sid=okta_session_abc'],
				note: 'Back at the SSO endpoint with both the original AuthnRequest and an Okta session. Okta validates the request and builds the correlated assertion.',
			},
			{
				type: 'response',
				from: 'Okta',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: text/html'],
				body: `<html>
<body onload="document.forms[0].submit()">
  <form method="POST" action="https://secrets.example.com/saml/acs">
    <input type="hidden" name="SAMLResponse" value="PHNhbWxwOlJlc3Bv...base64-encoded..."/>
    <input type="hidden" name="RelayState" value="/dashboard"/>
  </form>
</body>
</html>`,
				note: 'Auto-submit form with signed SAML assertion (HTTP-POST binding). The browser submits this form automatically on page load.',
			},
		],
		actors: {
			browser: true,
			ots: false,
			okta: true,
		},
	},
	{
		id: 6,
		title: 'Browser POSTs assertion to OTS ACS endpoint',
		userSees: 'loading',
		urlBar: 'https://secrets.example.com/saml/acs',
		description:
			"Browser auto-submits the SAML Response to OTS's Assertion Consumer Service (ACS) endpoint. OTS validates the assertion thoroughly and creates a local session from the SAML attributes.",
		securityNote:
			"The ACS endpoint must perform all of these validations: (1) verify Response and Assertion XML signatures against Okta's certificate, (2) check InResponseTo matches the stored AuthnRequest ID, (3) validate NotBefore/NotOnOrAfter timestamps with clock skew tolerance (typically 2-5 minutes), (4) confirm AudienceRestriction matches the SP's entity ID, (5) verify Recipient URL matches this ACS endpoint, (6) store the Assertion ID and reject any ID seen before to prevent replay attacks. Separately from validation, the choice of local account key matters. The account key should be (IdP entityID, an immutable NameID). This demo requests the emailAddress NameID format because it is what most Okta SAML apps are configured with, but that is the common default, not the recommended one: an email address is a mutable, reassignable attribute, so keying accounts on it means a rename silently orphans an account and a reissued address silently inherits one. Configure a persistent or Okta-user-ID NameID and treat email as a profile attribute to refresh; if the email NameID cannot be changed, resolve it only through an explicitly provisioned mapping table (see the account-resolution step below).",
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'OTS',
				method: 'POST',
				url: 'https://secrets.example.com/saml/acs',
				headers: ['Content-Type: application/x-www-form-urlencoded', 'Origin: https://contoso.okta.com'],
				body: 'SAMLResponse=PHNhbWxw...&RelayState=%2Fdashboard',
				expandedPayload: {
					label: 'Decoded SAMLResponse',
					content: `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="_response_xyz789"
  InResponseTo="_request_abc123"
  Version="2.0"
  IssueInstant="2024-01-15T10:31:00Z"
  Destination="https://secrets.example.com/saml/acs">
  <saml:Issuer>http://www.okta.com/exk1234</saml:Issuer>
  <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <ds:SignedInfo>
      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
      <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <ds:Reference URI="#_response_xyz789">
        <ds:Transforms>
          <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
          <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        </ds:Transforms>
        <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <ds:DigestValue>base64-digest-value</ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue>base64-signature-value</ds:SignatureValue>
  </ds:Signature>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion Version="2.0" ID="_assertion_def456"
    IssueInstant="2024-01-15T10:31:00Z">
    <saml:Issuer>http://www.okta.com/exk1234</saml:Issuer>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <!-- Assertion-level RSA-SHA256 signature -->
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <ds:Reference URI="#_assertion_def456">
          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <ds:DigestValue>base64-assertion-digest</ds:DigestValue>
        </ds:Reference>
      </ds:SignedInfo>
      <ds:SignatureValue>base64-assertion-signature</ds:SignatureValue>
    </ds:Signature>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
        alice@contoso.com
      </saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData
          InResponseTo="_request_abc123"
          NotOnOrAfter="2024-01-15T10:36:00Z"
          Recipient="https://secrets.example.com/saml/acs"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="2024-01-15T10:26:00Z" NotOnOrAfter="2024-01-15T10:36:00Z">
      <saml:AudienceRestriction>
        <saml:Audience>https://secrets.example.com/saml/metadata</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="2024-01-15T10:31:00Z"
      SessionIndex="_session_okta_ghi789"
      SessionNotOnOrAfter="2024-01-15T18:31:00Z">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>
          urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
        </saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified">
        <saml:AttributeValue>alice@contoso.com</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="firstName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified">
        <saml:AttributeValue>Alice</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="lastName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified">
        <saml:AttributeValue>Smith</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="groups" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified">
        <saml:AttributeValue>engineering</saml:AttributeValue>
        <saml:AttributeValue>secrets-admins</saml:AttributeValue>
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
				label: 'Validate SAML assertion',
				note: "Verify Response + Assertion XML signatures against Okta's X.509 certificate, check InResponseTo matches _request_abc123, validate NotBefore/NotOnOrAfter timestamps, confirm AudienceRestriction, verify Recipient URL, store assertion ID _assertion_def456 for replay prevention.",
			},
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Resolve the local account',
				note: 'The NameID in this assertion is alice@contoso.com, so a lookup keyed on (entityID, NameID) here is an email-keyed lookup with every problem an email key has: a rename orphans the account and a reissued address inherits it. Two safe options. Recommended: configure the Okta app to send an immutable NameID (the Okta user ID, or the persistent format) and key the account on (http://www.okta.com/exk1234, that NameID). Otherwise: keep the email NameID but resolve it through an explicit mapping table that links (entityID, NameID) to a local account id, is populated by provisioning (SCIM) or an administrator rather than auto-created on first sight, and is re-linked by an administrator when the address changes. Either way the email attribute is profile data to refresh on the account, not the key it is stored under.',
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
				note: 'Session created from SAML attributes, redirect to original destination via RelayState',
			},
		],
		actors: {
			browser: true,
			ots: true,
			okta: false,
		},
	},
	{
		id: 7,
		title: 'Authenticated request reaches dashboard',
		userSees: 'dashboard',
		urlBar: 'https://secrets.example.com/dashboard',
		description:
			'Browser follows the redirect and loads the dashboard with the new session cookie. OTS reads the session to identify the user and render their content.',
		securityNote:
			"The session cookie stores identity derived from the SAML assertion. OTS should enforce session timeouts shorter than the assertion's SessionNotOnOrAfter value. RelayState must be validated against an allowlist to prevent open redirect attacks.",
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
				note: 'Extract user identity: alice@contoso.com, groups: [engineering, secrets-admins]',
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
				note: 'Dashboard HTML rendered with user context from SAML attributes',
			},
		],
		actors: {
			browser: true,
			ots: true,
			okta: false,
		},
	},
	{
		id: 8,
		title: 'Subsequent requests use session cookie',
		userSees: 'dashboard',
		urlBar: 'https://secrets.example.com/dashboard',
		description:
			'All future requests use the session cookie. No further interaction with Okta until the session expires or the user logs out. Logout can trigger SAML Single Logout (SLO) to terminate the Okta session as well.',
		securityNote:
			'SP session lifetime is independent of the IdP session. If the SP session expires, the user may be silently re-authenticated if their Okta session is still active (no password prompt). Implement session rotation on sensitive operations and absolute timeouts to limit exposure. Without SAML SLO, logging out of OTS leaves the Okta session active.',
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
				note: 'Session valid, no SAML roundtrip needed. User: alice@contoso.com',
			},
			{
				type: 'response',
				from: 'OTS',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: application/json'],
				body: '{"secrets": [...], "user": "alice@contoso.com"}',
				note: 'Normal API response, no IdP interaction needed',
			},
		],
		actors: {
			browser: true,
			ots: true,
			okta: false,
		},
	},
];
