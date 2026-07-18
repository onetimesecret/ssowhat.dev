// src/lib/sso-demos/idp-saml-okta/steps.ts

import type { Step } from '$lib/sso-demos';

/**
 * IdP-initiated SAML flow with Okta as the IdP.
 *
 * The user starts at Okta (the Identity Provider), not at the application.
 * They sign in to the Okta dashboard and click the OTS tile. Okta generates
 * an unsolicited SAML Response -- no AuthnRequest was ever made -- and posts
 * it to OTS's ACS endpoint.
 *
 * This is the mirror image of the SP-initiated flow, and it is how a large
 * share of real enterprise logins actually happen: employees live in the
 * IdP dashboard and launch apps from tiles.
 *
 * The defining protocol difference: the SAML Response carries no
 * InResponseTo attribute, so the SP cannot correlate it with a request it
 * made. Every security consequence in this demo follows from that.
 *
 * Bindings:
 *   SAMLResponse -> HTTP-POST (base64-encoded in auto-submit form)
 *   (no AuthnRequest exists in this flow)
 */
export const STEPS: Step[] = [
	{
		id: 1,
		title: 'User navigates to the Okta dashboard',
		userSees: 'okta-login',
		urlBar: 'https://contoso.okta.com/',
		description:
			'The flow starts at the IdP, not the application. The user opens their company Okta dashboard directly (bookmark, browser homepage, or IT portal link). No Okta session exists yet, so Okta presents its login page. OTS is not involved at all in this step.',
		securityNote:
			'Compare with SP-initiated SAML, where the first request hits the application. Here the application has no idea a login is coming: no AuthnRequest is generated, no request ID is stored, and there is nothing for the SP to later correlate the response against.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'Okta',
				method: 'GET',
				url: 'https://contoso.okta.com/',
				headers: ['Cookie: (none)'],
				note: 'No Okta session cookie present',
			},
			{
				type: 'response',
				from: 'Okta',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: text/html'],
				note: 'Okta login page rendered',
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
		title: 'User authenticates with Okta',
		userSees: 'okta-dashboard',
		urlBar: 'https://contoso.okta.com/app/UserHome',
		description:
			"User enters credentials (and completes MFA if the org-wide sign-on policy requires it). Okta establishes an IdP session and renders the end-user dashboard: a grid of tiles for every application assigned to this user. The OTS tile is among them.",
		securityNote:
			'The Okta session created here is the keys-to-the-kingdom credential: from this dashboard the user can silently SSO into every assigned app without re-entering a password. This is why IdP session protection (MFA, device trust, session lifetime limits) matters more than any individual SP session.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'Okta',
				method: 'POST',
				url: 'https://contoso.okta.com/api/v1/authn',
				headers: ['Content-Type: application/json'],
				body: '{\n  "username": "alice@contoso.com",\n  "password": "********"\n}',
				note: 'Credentials submitted to Okta authentication API',
			},
			{
				type: 'response',
				from: 'Okta',
				to: 'Browser',
				status: '200 OK',
				headers: [
					'Content-Type: application/json',
					'Set-Cookie: sid=okta_session_abc; HttpOnly; Secure; SameSite=Lax',
				],
				body: '{\n  "status": "SUCCESS",\n  "sessionToken": "20111..."\n}',
				note: 'IdP session established; dashboard with app tiles rendered',
			},
		],
		actors: {
			browser: true,
			okta: true,
			ots: false,
		},
	},
	{
		id: 3,
		title: 'User clicks the OTS app tile',
		userSees: 'okta-dashboard',
		urlBar: 'https://contoso.okta.com/app/ots-saml/exk1234/sso/saml',
		description:
			"User clicks the Onetime Secret tile. The tile is simply a link to Okta's own SSO endpoint for the OTS app. Because the user already has an Okta session, Okta immediately generates a signed SAML Response -- unsolicited, since no AuthnRequest exists -- and returns an auto-submitting HTML form targeting OTS's ACS endpoint.",
		securityNote:
			"This is the step SP-initiated flows don't have: the IdP mints an assertion nobody asked for. The generated Response has no InResponseTo attribute. RelayState is not a deep-link echo here either -- it's the static Default RelayState value configured on the Okta app (often empty), because there was no original SP request to preserve.",
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'Okta',
				method: 'GET',
				url: 'https://contoso.okta.com/app/ots-saml/exk1234/sso/saml',
				headers: ['Cookie: sid=okta_session_abc'],
				note: 'App tile link. Same endpoint the SP-initiated flow redirects to -- but with no SAMLRequest query parameter.',
			},
			{
				type: 'internal',
				from: 'Okta',
				to: 'Okta',
				label: 'Generate unsolicited SAML Response',
				note: 'Valid IdP session found and user is assigned to the OTS app. Build assertion from directory attributes, sign Response and Assertion, set RelayState to the app’s configured Default RelayState. No AuthnRequest to reference, so no InResponseTo.',
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
    <input type="hidden" name="RelayState" value=""/>
  </form>
</body>
</html>`,
				note: 'Auto-submit form with signed SAML assertion (HTTP-POST binding). Identical mechanics to SP-initiated -- the difference is in the XML it carries.',
			},
		],
		actors: {
			browser: true,
			okta: true,
			ots: false,
		},
	},
	{
		id: 4,
		title: 'Browser POSTs unsolicited assertion to OTS',
		userSees: 'loading',
		urlBar: 'https://secrets.example.com/saml/acs',
		description:
			"Browser auto-submits the SAML Response to OTS's ACS endpoint. This is the first time OTS hears anything about this login. The Response is missing InResponseTo, so OTS must decide: accept unsolicited responses (IdP-initiated enabled) or reject them. Everything else -- signatures, timestamps, audience -- validates exactly as in the SP-initiated flow.",
		securityNote:
			"InResponseTo is the SP's only tie between a response and a request it made; without it, two defenses are lost. (1) Replay: a captured assertion can be replayed within its validity window against an SP that doesn't track seen assertion IDs -- the assertion ID cache stops being a nice-to-have and becomes the primary defense. (2) Login CSRF / session injection: an attacker can POST their own valid assertion to a victim's browser session, logging the victim into the attacker's account. This is why many SPs disable IdP-initiated SAML entirely, and why others convert it: receive the unsolicited response, discard it, and start a fresh SP-initiated flow.",
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'OTS',
				method: 'POST',
				url: 'https://secrets.example.com/saml/acs',
				headers: ['Content-Type: application/x-www-form-urlencoded', 'Origin: https://contoso.okta.com'],
				body: 'SAMLResponse=PHNhbWxw...&RelayState=',
				expandedPayload: {
					label: 'Decoded SAMLResponse (note: no InResponseTo)',
					content: `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="_response_unsolicited_741"
  Version="2.0"
  IssueInstant="2024-01-15T10:31:00Z"
  Destination="https://secrets.example.com/saml/acs">
  <!-- No InResponseTo attribute: nothing requested this response -->
  <saml:Issuer>http://www.okta.com/exk1234</saml:Issuer>
  <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <ds:SignedInfo>
      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
      <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <ds:Reference URI="#_response_unsolicited_741">
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
  <saml:Assertion Version="2.0" ID="_assertion_jkl012"
    IssueInstant="2024-01-15T10:31:00Z">
    <saml:Issuer>http://www.okta.com/exk1234</saml:Issuer>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <!-- Assertion-level RSA-SHA256 signature -->
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <ds:Reference URI="#_assertion_jkl012">
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
          NotOnOrAfter="2024-01-15T10:36:00Z"
          Recipient="https://secrets.example.com/saml/acs"/>
        <!-- SubjectConfirmationData also lacks InResponseTo -->
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="2024-01-15T10:26:00Z" NotOnOrAfter="2024-01-15T10:36:00Z">
      <saml:AudienceRestriction>
        <saml:Audience>https://secrets.example.com/saml/metadata</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="2024-01-15T10:30:00Z"
      SessionIndex="_session_okta_mno345"
      SessionNotOnOrAfter="2024-01-15T18:30:00Z">
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
				label: 'Validate unsolicited SAML assertion',
				note: "Verify Response + Assertion XML signatures against Okta's X.509 certificate, validate NotBefore/NotOnOrAfter timestamps, confirm AudienceRestriction and Recipient URL. InResponseTo check is skipped -- there is no stored request ID. Store assertion ID _assertion_jkl012 and reject any repeat: with no request correlation, the replay cache is the primary anti-replay defense.",
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
				note: 'Session created from SAML attributes. RelayState was empty, so OTS falls back to its default post-login landing page.',
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
		title: 'Authenticated request reaches dashboard',
		userSees: 'dashboard',
		urlBar: 'https://secrets.example.com/dashboard',
		description:
			'Browser follows the redirect and loads the OTS dashboard with the new session cookie. From here on, the two flows converge: the session is identical to one created by SP-initiated login. The user never saw an OTS login page at any point.',
		securityNote:
			'Because the user never expresses intent to the SP before the assertion arrives, the SP cannot use RelayState for deep links safely -- an attacker-crafted unsolicited response could carry a malicious RelayState. Treat RelayState from unsolicited responses as untrusted: validate against an allowlist or ignore it entirely.',
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
			okta: false,
			ots: true,
		},
	},
	{
		id: 6,
		title: 'The safer alternative: convert to SP-initiated',
		userSees: 'dashboard',
		urlBar: 'https://secrets.example.com/dashboard',
		description:
			'Many SPs keep the dashboard-tile user experience without accepting unsolicited assertions. The trick: point the Okta tile at an SP URL (e.g. /auth/sso?idp=okta) instead of the SAML endpoint. The SP receives that GET and starts a normal SP-initiated flow -- fresh AuthnRequest, stored request ID, full InResponseTo validation. The user still just clicks a tile; the unsolicited-response problem never arises.',
		securityNote:
			'This "IdP-initiated in UX, SP-initiated in protocol" pattern costs one extra redirect and removes the entire unsolicited-response attack surface. In Okta this is a Bookmark app or the SP’s login URL configured as the tile target. If you control the SP implementation, prefer this over accepting unsolicited responses; if you must accept them, the assertion ID replay cache and strict validity windows are non-negotiable.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'OTS',
				method: 'GET',
				url: 'https://secrets.example.com/auth/sso?idp=okta',
				headers: ['Cookie: (none)'],
				note: 'Alternative tile target: a plain SP URL, not the SAML ACS endpoint',
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
				],
				note: 'SP generates a fresh AuthnRequest and the flow proceeds exactly as in the SP-initiated demo, with InResponseTo intact',
			},
		],
		actors: {
			browser: true,
			okta: false,
			ots: true,
		},
	},
];
