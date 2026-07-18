// src/lib/sso-demos/slo-saml-okta/steps.ts

import type { Step } from '$lib/sso-demos';

/**
 * SP-initiated SAML Single Logout (SLO) with Okta as the IdP.
 *
 * Starting state: Alice logged into OTS via SAML earlier today, then
 * launched the Team Wiki from her Okta dashboard. Three sessions exist:
 * OTS local session, Okta IdP session, and Wiki local session.
 *
 * Alice clicks "Log out" in OTS. OTS sends a LogoutRequest to Okta,
 * Okta terminates its own session and attempts to propagate logout to
 * the Wiki via front-channel iframes -- which fails. Okta returns a
 * LogoutResponse with status PartialLogout.
 *
 * This is the honest version of SLO: it half-works everywhere, and the
 * spec has a status code (PartialLogout) that exists precisely because
 * the protocol's authors knew it.
 *
 * Bindings:
 *   LogoutRequest (SP->IdP)   -> HTTP-Redirect (deflated, base64, signed query string)
 *   LogoutRequest (IdP->SPs)  -> front-channel iframes (HTTP-Redirect per SP)
 *   LogoutResponse (IdP->SP)  -> HTTP-POST (base64-encoded in auto-submit form)
 */
export const STEPS: Step[] = [
	{
		id: 1,
		title: 'User clicks "Log out" in OTS',
		userSees: 'dashboard',
		urlBar: 'https://secrets.example.com/dashboard',
		description:
			'Alice clicks "Log out". OTS destroys its local session immediately, then generates a signed SAML LogoutRequest carrying the NameID and SessionIndex it saved from the original login assertion, and redirects the browser to Okta’s SLO endpoint.',
		securityNote:
			'Destroy the local session BEFORE redirecting to the IdP. The SLO round-trip can fail at any point (user closes the tab, IdP times out, response never arrives) -- if the SP waits for the LogoutResponse to kill its session, a failed SLO leaves the user logged in after they believe they logged out. The SessionIndex from the login assertion is required here: without storing it at login time, the SP cannot construct a valid LogoutRequest at all.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'OTS',
				method: 'POST',
				url: 'https://secrets.example.com/logout',
				headers: ['Cookie: _ots_session=encrypted-session-data', 'Content-Type: application/x-www-form-urlencoded'],
				body: 'csrf_token=tok_9f8e7d',
				note: 'Logout must be a POST with CSRF protection -- a GET logout endpoint lets any third-party page log your users out',
			},
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Destroy local session + build LogoutRequest',
				note: 'Delete server-side session, expire _ots_session cookie. Generate LogoutRequest ID _logout_req_111, store it for InResponseTo validation. Include NameID (alice@contoso.com) and SessionIndex (_session_okta_ghi789) saved from the login assertion.',
			},
			{
				type: 'response',
				from: 'OTS',
				to: 'Browser',
				status: '302 Found',
				headers: [
					'Set-Cookie: _ots_session=; Max-Age=0; HttpOnly; Secure',
					'Location: https://contoso.okta.com/app/ots-saml/exk1234/slo/saml?',
					'  SAMLRequest=base64-deflate-encoded-xml',
					'  &SigAlg=http://www.w3.org/2001/04/xmldsig-more%23rsa-sha256',
					'  &Signature=base64-encoded-signature',
				],
				note: 'Local session is already dead. Everything after this point is best-effort cleanup of the OTHER sessions.',
			},
		],
		actors: {
			browser: true,
			ots: true,
			okta: false,
			wiki: false,
		},
	},
	{
		id: 2,
		title: 'Okta receives the LogoutRequest',
		userSees: 'loading',
		urlBar: 'https://contoso.okta.com/app/ots-saml/exk1234/slo/saml',
		description:
			'Browser carries the LogoutRequest to Okta. Okta validates the signature, matches the NameID and SessionIndex to Alice’s IdP session, and discovers the session has a second participant: the Team Wiki, which Alice launched from her Okta dashboard this morning.',
		securityNote:
			'The IdP must verify the LogoutRequest signature and that the NameID/SessionIndex belong to the session bound to this browser. An unsigned or unvalidated LogoutRequest is a denial-of-service primitive: anyone who learns a NameID could forge logouts and repeatedly kick that user out of every app.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'Okta',
				method: 'GET',
				url: 'https://contoso.okta.com/app/ots-saml/exk1234/slo/saml?SAMLRequest=...&SigAlg=...&Signature=...',
				headers: ['Cookie: sid=okta_session_abc'],
				expandedPayload: {
					label: 'Decoded SAMLRequest (LogoutRequest)',
					content: `<samlp:LogoutRequest
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="_logout_req_111"
  Version="2.0"
  IssueInstant="2024-01-15T17:45:00Z"
  Destination="https://contoso.okta.com/app/ots-saml/exk1234/slo/saml"
  NotOnOrAfter="2024-01-15T17:50:00Z">
  <saml:Issuer>https://secrets.example.com/saml/metadata</saml:Issuer>
  <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
    alice@contoso.com
  </saml:NameID>
  <samlp:SessionIndex>_session_okta_ghi789</samlp:SessionIndex>
</samlp:LogoutRequest>`,
				},
			},
			{
				type: 'internal',
				from: 'Okta',
				to: 'Okta',
				label: 'Validate LogoutRequest + enumerate session participants',
				note: 'Verify SP signature, match NameID + SessionIndex to the IdP session for this browser. Session participants: OTS (requester, already logged out locally) and Team Wiki (launched via IdP-initiated SSO at 09:12). Wiki must be notified before this session can fully close.',
			},
		],
		actors: {
			browser: true,
			ots: false,
			okta: true,
			wiki: false,
		},
	},
	{
		id: 3,
		title: 'Okta propagates logout to the Wiki (front-channel)',
		userSees: 'okta-signout',
		urlBar: 'https://contoso.okta.com/app/ots-saml/exk1234/slo/saml',
		description:
			'Okta renders a page with a hidden iframe per session participant, each loading that SP’s SLO endpoint with a LogoutRequest. This is front-channel logout: the user’s own browser is the messenger. The Wiki’s iframe loads -- but the Wiki’s session cookie is SameSite=Lax, so it is not sent in the third-party iframe request. The Wiki sees an anonymous request and has no session to terminate.',
		securityNote:
			'This is where SLO half-works everywhere. Front-channel logout depends on the browser sending each SP’s session cookie inside a cross-site iframe -- exactly what SameSite cookies, Safari ITP, and third-party cookie phase-out are designed to prevent. The iframe returns 200, the cookie never went along, and the session survives. The IdP cannot distinguish "logged out" from "request arrived without credentials." Back-channel SLO (SOAP, IdP-to-SP server-to-server) avoids the browser entirely but is rarely implemented on either side: Okta does not support it for SAML apps, and most SPs never expose a back-channel endpoint.',
		http: [
			{
				type: 'response',
				from: 'Okta',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: text/html'],
				body: `<html>
<body>
  <!-- one hidden iframe per session participant -->
  <iframe style="display:none"
    src="https://wiki.contoso.com/saml/slo?SAMLRequest=...&Signature=...">
  </iframe>
  <script>/* poll iframes, give up after 5s timeout */</script>
</body>
</html>`,
				note: 'Front-channel propagation page. Okta waits a few seconds for each iframe, then proceeds regardless of outcome.',
			},
			{
				type: 'request',
				from: 'Browser',
				to: 'Wiki',
				method: 'GET',
				url: 'https://wiki.contoso.com/saml/slo?SAMLRequest=...&Signature=...',
				headers: ['Cookie: (none -- wiki_session is SameSite=Lax, not sent in cross-site iframe)'],
				note: 'The LogoutRequest arrives, but without the session cookie the Wiki cannot tell whose session to kill',
			},
			{
				type: 'response',
				from: 'Wiki',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: text/html'],
				note: 'Wiki responds 200 with no session to terminate. Alice’s wiki_session cookie is untouched. Okta’s iframe never receives a SAML LogoutResponse.',
			},
		],
		actors: {
			browser: true,
			ots: false,
			okta: true,
			wiki: true,
		},
	},
	{
		id: 4,
		title: 'Okta gives up and terminates its own session',
		userSees: 'okta-signout',
		urlBar: 'https://contoso.okta.com/app/ots-saml/exk1234/slo/saml',
		description:
			'The Wiki never confirms logout. After its timeout, Okta stops waiting, terminates the IdP session, and clears its own session cookie. The IdP session is now genuinely dead -- Alice cannot silently SSO into new apps -- but Okta knows propagation was incomplete.',
		securityNote:
			'Killing the IdP session is the single most valuable part of SLO: it stops new silent re-authentication into every connected app. But it does nothing to sessions that already exist. Any SP session created before this moment lives on until its own timeout. This asymmetry is why short SP session lifetimes matter more than SLO does.',
		http: [
			{
				type: 'internal',
				from: 'Okta',
				to: 'Okta',
				label: 'Propagation timeout + session termination',
				note: 'Wiki iframe: no LogoutResponse after 5s -- recorded as failed. Terminate IdP session okta_session_abc. Result for LogoutResponse status: PartialLogout (requester logged out, but not all participants confirmed).',
			},
			{
				type: 'response',
				from: 'Okta',
				to: 'Browser',
				status: '200 OK',
				headers: ['Set-Cookie: sid=; Max-Age=0; HttpOnly; Secure', 'Content-Type: text/html'],
				note: 'Okta session cookie cleared. Next: return the LogoutResponse to the SP that started this (OTS).',
			},
		],
		actors: {
			browser: true,
			ots: false,
			okta: true,
			wiki: false,
		},
	},
	{
		id: 5,
		title: 'Okta returns LogoutResponse: PartialLogout',
		userSees: 'loading',
		urlBar: 'https://contoso.okta.com/app/ots-saml/exk1234/slo/saml',
		description:
			'Okta sends the browser back to OTS’s SLO endpoint with a signed LogoutResponse via HTTP-POST auto-submit form. The status is not Success -- it is PartialLogout, the spec’s built-in admission that not every session participant could be logged out.',
		securityNote:
			'urn:oasis:names:tc:SAML:2.0:status:PartialLogout exists in the SAML 2.0 core spec (section 3.7.3.2) precisely because the protocol’s authors knew propagation would fail in practice. Many IdPs return Success regardless of propagation outcome, and most SPs never inspect the status code at all -- treat the LogoutResponse as informational, never as proof that other sessions are gone.',
		http: [
			{
				type: 'response',
				from: 'Okta',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: text/html'],
				body: `<html>
<body onload="document.forms[0].submit()">
  <form method="POST" action="https://secrets.example.com/saml/slo">
    <input type="hidden" name="SAMLResponse" value="PHNhbWxwOkxvZ291dFJlc3Bv...base64..."/>
  </form>
</body>
</html>`,
				expandedPayload: {
					label: 'Decoded SAMLResponse (LogoutResponse)',
					content: `<samlp:LogoutResponse
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="_logout_resp_222"
  InResponseTo="_logout_req_111"
  Version="2.0"
  IssueInstant="2024-01-15T17:45:08Z"
  Destination="https://secrets.example.com/saml/slo">
  <saml:Issuer>http://www.okta.com/exk1234</saml:Issuer>
  <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <!-- RSA-SHA256 signature over the LogoutResponse -->
  </ds:Signature>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success">
      <samlp:StatusCode
        Value="urn:oasis:names:tc:SAML:2.0:status:PartialLogout"/>
    </samlp:StatusCode>
  </samlp:Status>
</samlp:LogoutResponse>`,
				},
				note: 'Nested status code: top-level Success, second-level PartialLogout -- "your logout worked, everyone else’s is a maybe"',
			},
		],
		actors: {
			browser: true,
			ots: false,
			okta: true,
			wiki: false,
		},
	},
	{
		id: 6,
		title: 'OTS confirms sign-out to the user',
		userSees: 'signed-out',
		urlBar: 'https://secrets.example.com/saml/slo',
		description:
			'Browser POSTs the LogoutResponse to OTS. OTS validates the signature and InResponseTo, logs the PartialLogout status, and renders the signed-out page. Nothing depends on this response arriving -- the OTS session died back in step 1.',
		securityNote:
			'Validate the LogoutResponse like any SAML message: signature against the IdP certificate, InResponseTo against the stored request ID, Destination against this endpoint. But design so its absence changes nothing. The honest UX here is also worth stating: "You are signed out of OTS" is provable; "You are signed out of everything" is not, and the page should not claim it.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'OTS',
				method: 'POST',
				url: 'https://secrets.example.com/saml/slo',
				headers: ['Content-Type: application/x-www-form-urlencoded', 'Origin: https://contoso.okta.com'],
				body: 'SAMLResponse=PHNhbWxwOkxvZ291dFJlc3Bv...',
			},
			{
				type: 'internal',
				from: 'OTS',
				to: 'OTS',
				label: 'Validate LogoutResponse',
				note: 'Verify signature against Okta certificate, InResponseTo matches _logout_req_111, Destination matches this endpoint. Status: PartialLogout -- log it for the audit trail. Local session was already destroyed in step 1; nothing else to do.',
			},
			{
				type: 'response',
				from: 'OTS',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: text/html', 'Cache-Control: no-store'],
				note: 'Signed-out page rendered. It says "signed out of OTS" -- not "signed out of everything."',
			},
		],
		actors: {
			browser: true,
			ots: true,
			okta: false,
			wiki: false,
		},
	},
	{
		id: 7,
		title: 'Epilogue: the Wiki session is still alive',
		userSees: 'signed-out',
		urlBar: 'https://secrets.example.com/saml/slo',
		description:
			'Final score: OTS session dead (step 1), Okta session dead (step 4), Wiki session alive. If Alice opens the Wiki in another tab right now, she is still logged in -- the front-channel LogoutRequest arrived without her session cookie and changed nothing. The Wiki session survives until its own idle timeout.',
		securityNote:
			'Treat SLO as best-effort, and defend accordingly: (1) short SP session lifetimes with idle timeout, so orphaned sessions die on their own; (2) SCIM deactivation with session revocation for offboarding, which is the reliable kill switch SLO is not; (3) if your stack is OIDC rather than SAML, back-channel logout (RFC 9068-adjacent, OpenID Connect Back-Channel Logout 1.0) is the modern server-to-server answer -- but only if both sides actually implement it. The one thing NOT to do is skip local session destruction while waiting for SLO to work.',
		http: [
			{
				type: 'request',
				from: 'Browser',
				to: 'Wiki',
				method: 'GET',
				url: 'https://wiki.contoso.com/pages/runbooks',
				headers: ['Cookie: wiki_session=still-perfectly-valid'],
				note: 'Hypothetical: Alice opens the Wiki after "logging out of everything"',
			},
			{
				type: 'response',
				from: 'Wiki',
				to: 'Browser',
				status: '200 OK',
				headers: ['Content-Type: text/html'],
				note: 'Fully authenticated page. The Wiki never learned about the logout. This session lives until the Wiki’s own timeout expires it.',
			},
		],
		actors: {
			browser: true,
			ots: false,
			okta: false,
			wiki: true,
		},
	},
];
