// src/lib/sso-demos/oidc-saml-bridge/steps.ts

import type { Step } from '$lib/sso-demos';

const STEPS: Step[] = [
  {
    id: 1,
    title: "User requests protected resource",
    userSees: "blank",
    urlBar: "https://secrets.example.com/dashboard",
    description:
      "User navigates to the dashboard. Caddy intercepts and checks auth. oauth2-proxy has no session for this browser, so it starts an OIDC Authorization Code flow: it generates a random state, a nonce, and a PKCE code_verifier, stores all three server-side, and redirects the browser to Logto with code_challenge = BASE64URL(SHA256(code_verifier)).",
    securityNote:
      "The `state` parameter is validated on callback to prevent CSRF. PKCE (RFC 7636) is sent as well: the OAuth 2.0 Security BCP (RFC 9700) recommends PKCE for every client, confidential ones included, because it binds the authorization code to the party that started the flow and so defeats code injection even when a client secret is in play. Treating PKCE as a public-client-only measure is out of date.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "Caddy",
        method: "GET",
        url: "https://secrets.example.com/dashboard",
        headers: ["Cookie: (none)"],
        note: "No session cookie present",
      },
      {
        type: "internal",
        from: "Caddy",
        to: "oauth2-proxy",
        label: "forward_auth subrequest",
        note: "Caddy asks auth layer: is this user authenticated?",
      },
      {
        type: "response",
        from: "Caddy",
        to: "Browser",
        status: "302 Found",
        headers: [
          "Location: https://logto.example.com/oidc/auth?",
          "  client_id=ots-app",
          "  &redirect_uri=https://secrets.example.com/oauth2/callback",
          "  &response_type=code",
          "  &scope=openid profile email",
          "  &state=random-csrf-token",
          "  &nonce=random-nonce",
          "  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
          "  &code_challenge_method=S256",
        ],
        note: "Not authenticated \u2192 redirect to Logto with state, nonce, and the S256 PKCE challenge. The code_verifier stays on the proxy.",
      },
    ],
    actors: {
      browser: true,
      caddy: true,
      logto: false,
      entra: false,
      ots: false,
    },
  },
  {
    id: 2,
    title: "Browser follows redirect to Logto",
    userSees: "logto-signin",
    urlBar:
      "https://logto.example.com/sign-in?first_screen=signIn&interaction_id=abc123",
    description:
      "Browser lands on Logto's sign-in page. User sees login options.",
    securityNote:
      "Session cookies must use HttpOnly and Secure flags. SameSite policy should be configured based on whether components share the same domain.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "Logto",
        method: "GET",
        url: "https://logto.example.com/oidc/auth?client_id=ots-app&...",
        headers: [],
      },
      {
        type: "response",
        from: "Logto",
        to: "Browser",
        status: "302 Found",
        headers: [
          "Location: https://logto.example.com/sign-in?...",
          "Set-Cookie: logto_session_id=sess_abc123; HttpOnly; Secure; SameSite=Lax",
        ],
        note: "Logto creates pre-auth session, redirects to sign-in UI. Cookie and parameter names throughout this demo are reconstructed from the documented behaviour of Caddy, oauth2-proxy, Logto, and Entra ID; they are not a packet capture, and exact names vary by version and configuration.",
      },
      {
        type: "request",
        from: "Browser",
        to: "Logto",
        method: "GET",
        url: "https://logto.example.com/sign-in?first_screen=signIn&...",
        headers: ["Cookie: logto_session_id=sess_abc123"],
      },
      {
        type: "response",
        from: "Logto",
        to: "Browser",
        status: "200 OK",
        headers: ["Content-Type: text/html"],
        note: "Sign-in page HTML",
      },
    ],
    actors: {
      browser: true,
      caddy: false,
      logto: true,
      entra: false,
      ots: false,
    },
  },
  {
    id: 3,
    title: "User clicks Enterprise SSO",
    userSees: "logto-signin",
    urlBar:
      "https://logto.example.com/sign-in?first_screen=signIn&interaction_id=abc123",
    description:
      "User identifies themselves or clicks the SSO button. Logto initiates SAML request to Entra ID.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "Logto",
        method: "POST",
        url: "https://logto.example.com/api/interaction/single-sign-on/connectors/entra-saml/authorization-url",
        headers: [
          "Cookie: logto_session_id=sess_abc123",
          "Content-Type: application/json",
        ],
        body: '{ "state": "sso-state-xyz" }',
        note: "Request SSO redirect URL",
      },
      {
        type: "response",
        from: "Logto",
        to: "Browser",
        status: "200 OK",
        headers: ["Content-Type: application/json"],
        body: '{\n  "redirectTo": "https://login.microsoftonline.com/{tenant}/saml2?SAMLRequest=base64..."\n}',
        note: "Logto returns SAML AuthnRequest URL",
      },
    ],
    actors: {
      browser: true,
      caddy: false,
      logto: true,
      entra: false,
      ots: false,
    },
  },
  {
    id: 4,
    title: "Browser redirects to Entra ID (IdP)",
    userSees: "entra-login",
    urlBar: "https://login.microsoftonline.com/contoso.com/saml2",
    description:
      "Browser follows redirect to customer's Entra ID. The SAMLRequest is a base64-encoded (and optionally signed) XML document. RelayState preserves application state.",
    securityNote:
      "SAML AuthnRequest signing is recommended for high-security environments to prevent tampering. Always validate the decoded structure. The RelayState parameter preserves application state across the SAML roundtrip.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "Entra",
        method: "GET",
        url: "https://login.microsoftonline.com/{tenant}/saml2?SAMLRequest=...&RelayState=sso-state-xyz",
        headers: [],
        expandedPayload: {
          label: "Decoded SAMLRequest",
          content: `<samlp:AuthnRequest
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  ID="_abc123"
  Version="2.0"
  IssueInstant="2024-01-15T10:30:00Z"
  Destination="https://login.microsoftonline.com/{tenant}/saml2"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
  AssertionConsumerServiceURL="https://logto.example.com/api/authn/saml/entra-connector">
  <saml:Issuer>https://logto.example.com</saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"/>
</samlp:AuthnRequest>`,
        },
      },
      {
        type: "response",
        from: "Entra",
        to: "Browser",
        status: "200 OK",
        headers: [
          "Content-Type: text/html",
          "Set-Cookie: ESTSAUTH=...; HttpOnly; Secure",
        ],
        note: "Entra ID login page (or auto-proceeds if session exists)",
      },
    ],
    actors: {
      browser: true,
      caddy: false,
      logto: false,
      entra: true,
      ots: false,
    },
  },
  {
    id: 5,
    title: "User authenticates with Entra ID",
    userSees: "entra-login",
    urlBar: "https://login.microsoftonline.com/contoso.com/saml2",
    description:
      "User enters credentials (or is auto-logged-in via Windows SSO). MFA may be required.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "Entra",
        method: "POST",
        url: "https://login.microsoftonline.com/{tenant}/login",
        headers: ["Content-Type: application/x-www-form-urlencoded"],
        body: "login=alice@contoso.com&passwd=\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022&ctx=...",
        note: "Credentials submitted",
      },
      {
        type: "response",
        from: "Entra",
        to: "Browser",
        status: "200 OK / 302",
        headers: [],
        note: "May redirect to MFA, or proceed directly",
      },
    ],
    actors: {
      browser: true,
      caddy: false,
      logto: false,
      entra: true,
      ots: false,
    },
  },
  {
    id: 6,
    title: "Entra ID issues SAML Response",
    userSees: "entra-autosubmit",
    urlBar: "https://login.microsoftonline.com/contoso.com/saml2",
    description:
      "After successful auth, Entra ID returns a signed SAML assertion via auto-submitting form.",
    http: [
      {
        type: "response",
        from: "Entra",
        to: "Browser",
        status: "200 OK",
        headers: ["Content-Type: text/html"],
        body: `<html>
<body onload="document.forms[0].submit()">
  <form method="POST" action="https://logto.example.com/api/authn/saml/entra-connector">
    <input type="hidden" name="SAMLResponse" value="base64-encoded-assertion"/>
    <input type="hidden" name="RelayState" value="sso-state-xyz"/>
  </form>
</body>
</html>`,
        note: "Auto-submit form with SAML assertion",
      },
    ],
    actors: {
      browser: true,
      caddy: false,
      logto: false,
      entra: true,
      ots: false,
    },
  },
  {
    id: 7,
    title: "Browser POSTs assertion to Logto",
    userSees: "loading",
    urlBar: "https://logto.example.com/api/authn/saml/entra-connector",
    description:
      "Browser auto-submits the SAML Response to Logto's assertion consumer service.",
    securityNote:
      "The SAML assertion contains the signed proof of identity from Entra ID. Production must validate signature, timestamps, InResponseTo field, and prevent replay attacks.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "Logto",
        method: "POST",
        url: "https://logto.example.com/api/authn/saml/entra-connector",
        headers: [
          "Content-Type: application/x-www-form-urlencoded",
          "Cookie: logto_session_id=sess_abc123",
        ],
        body: "SAMLResponse=PHNhbWxw...&RelayState=sso-state-xyz",
        expandedPayload: {
          label: "Decoded SAMLResponse (assertion)",
          content: `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  ID="_response_abc456"
  InResponseTo="_abc123"
  Version="2.0"
  IssueInstant="2024-01-15T10:31:00Z"
  Destination="https://logto.example.com/api/authn/saml/entra-connector">
  <saml:Issuer>https://sts.windows.net/{tenant}/</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion>
    <saml:Issuer>https://sts.windows.net/{tenant}/</saml:Issuer>
    <ds:Signature><!-- Entra's signature --></ds:Signature>
    <saml:Subject>
      <saml:NameID>alice@contoso.com</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData InResponseTo="_abc123"
          NotOnOrAfter="2024-01-15T10:36:00Z"
          Recipient="https://logto.example.com/api/authn/saml/entra-connector"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="2024-01-15T10:30:00Z" NotOnOrAfter="2024-01-15T10:36:00Z">
      <saml:AudienceRestriction>
        <saml:Audience>https://logto.example.com</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="2024-01-15T10:31:00Z" SessionIndex="_session_abc123">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress">
        <saml:AttributeValue>alice@contoso.com</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname">
        <saml:AttributeValue>Alice</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="http://schemas.microsoft.com/ws/2008/06/identity/claims/groups">
        <saml:AttributeValue>group-id-123</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`,
        },
      },
      {
        type: "internal",
        from: "Logto",
        to: "Logto",
        label: "Validate SAML assertion",
        note: "Verify signature against Entra ID's certificate, check timestamps, audience, etc.",
      },
      {
        type: "response",
        from: "Logto",
        to: "Browser",
        status: "302 Found",
        headers: [
          "Location: https://logto.example.com/oidc/auth/{interaction-id}",
          "Set-Cookie: logto_session_id=sess_abc123_authenticated; HttpOnly; Secure",
        ],
        note: "Session now contains verified identity",
      },
    ],
    actors: {
      browser: true,
      caddy: false,
      logto: true,
      entra: false,
      ots: false,
    },
  },
  {
    id: 8,
    title: "Logto issues authorization code",
    userSees: "loading",
    urlBar:
      "https://secrets.example.com/oauth2/callback?code=authz_code_xyz&state=random-csrf-token",
    description:
      "Logto issues authorization code, redirects back to the original application.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "Logto",
        method: "GET",
        url: "https://logto.example.com/oidc/auth/{interaction-id}",
        headers: ["Cookie: logto_session_id=sess_abc123_authenticated"],
      },
      {
        type: "response",
        from: "Logto",
        to: "Browser",
        status: "302 Found",
        headers: [
          "Location: https://secrets.example.com/oauth2/callback?code=authz_code_xyz&state=random-csrf-token",
        ],
        note: "Authorization code issued, redirect to app",
      },
    ],
    actors: {
      browser: true,
      caddy: true,
      logto: true,
      entra: false,
      ots: false,
    },
  },
  {
    id: 9,
    title: "Caddy exchanges code for tokens",
    userSees: "loading",
    urlBar:
      "https://secrets.example.com/oauth2/callback?code=authz_code_xyz&state=random-csrf-token",
    description:
      "Auth layer receives the code, checks that `state` matches the value it stored in step 1, then exchanges the code server-to-server with Logto for tokens, sending the PKCE code_verifier alongside its client credentials.",
    securityNote:
      "Authorization Code Flow with a client secret AND PKCE. The browser never sees this request: the token exchange happens server-to-server between oauth2-proxy and Logto. Logto checks BASE64URL(SHA256(code_verifier)) against the code_challenge from step 1, so a stolen code is useless to anyone who does not hold the verifier. The client secret authenticates the client; PKCE binds the code to this specific flow. They cover different attacks, so send both.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "Caddy",
        method: "GET",
        url: "https://secrets.example.com/oauth2/callback?code=authz_code_xyz&state=random-csrf-token",
        headers: [],
      },
      {
        type: "server",
        from: "Caddy (oauth2-proxy)",
        to: "Logto",
        label: "Server-to-server token exchange",
        method: "POST",
        url: "https://logto.example.com/oidc/token",
        headers: [
          "Content-Type: application/x-www-form-urlencoded",
          "Authorization: Basic base64(client_id:client_secret)",
        ],
        body: "grant_type=authorization_code&code=authz_code_xyz&redirect_uri=https://secrets.example.com/oauth2/callback&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
        note: "Browser never sees this request. code_verifier is the PKCE proof for the challenge sent in step 1.",
      },
      {
        type: "server-response",
        from: "Logto",
        to: "Caddy (oauth2-proxy)",
        status: "200 OK",
        body: `{
  "access_token": "at_xyz...",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "rt_abc..."
}`,
        expandedPayload: {
          label: "Decoded id_token (JWT)",
          content: `{
  "iss": "https://logto.example.com/oidc",
  "sub": "user_abc123",
  "aud": "ots-app",
  "exp": 1705323600,
  "iat": 1705320000,
  "email": "alice@contoso.com",
  "email_verified": true,
  "name": "Alice Smith",
  "identities": {
    "entra-saml": {
      "userId": "alice@contoso.com",
      "details": {
        "groups": ["group-id-123"]
      }
    }
  }
}`,
        },
        note: "Auth layer now has user identity. Logto maps SAML attributes (emailaddress, givenname, groups) to OIDC claims (email, name, identities).",
      },
      {
        type: "response",
        from: "Caddy",
        to: "Browser",
        status: "302 Found",
        headers: [
          "Location: https://secrets.example.com/dashboard",
          "Set-Cookie: _oauth2_proxy=encrypted-session-data; HttpOnly; Secure; SameSite=Lax; Path=/",
        ],
        note: "Auth layer creates its own session, redirects to original destination",
      },
    ],
    actors: {
      browser: true,
      caddy: true,
      logto: true,
      entra: false,
      ots: false,
    },
  },
  {
    id: 10,
    title: "Authenticated request reaches OTS",
    userSees: "dashboard",
    urlBar: "https://secrets.example.com/dashboard",
    description:
      "The user reaches their dashboard. OTS never validates a token; it reads identity out of HTTP headers that Caddy sets. That makes the headers the credential, and everything below is about not letting anyone else write them.",
    securityNote:
      "\"Internal network\" is not a trust boundary. RFC 9700 \u00a74.13 is directly about this pattern, and three points are load-bearing. (1) The proxy MUST strip or overwrite every identity header on each inbound request before forwarding, so a client that sends its own X-Auth-Request-Email or X-Forwarded-User cannot inject one; delete-then-set, never append. (2) The proxy and the app must authenticate each other, and any path that reaches OTS without passing the proxy is a full authentication bypass, because the attacker simply supplies the headers. RFC 9700 \u00a74.13 calls ensuring the authenticity of the communicating entities essential; in practice that is a network policy that does not route to the backend, mTLS between proxy and app, or at minimum a high-entropy shared secret header the proxy sets and the app verifies on every request. (3) The proxy-to-app channel MUST be protected against eavesdropping, injection, and replay to the same standard as the external TLS connection. OTS still owns its own response security headers (Content-Security-Policy, CORS); gateway authentication does not supply those.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "Caddy",
        method: "GET",
        url: "https://secrets.example.com/dashboard",
        headers: ["Cookie: _oauth2_proxy=encrypted-session-data"],
      },
      {
        type: "internal",
        from: "Caddy",
        to: "oauth2-proxy",
        label: "forward_auth validation + header sanitization",
        note: "Decrypt session cookie, validate not expired, then rewrite the identity headers from the session. Caddy\u2019s forward_auth copies back only an explicit allowlist of headers from the auth response (copy_headers), and the identity headers on the request to OTS are set, not merged, so a client-supplied X-Auth-Request-Email never survives the hop. RFC 9700 \u00a74.13.",
      },
      {
        type: "server",
        from: "Caddy",
        to: "OTS",
        method: "GET",
        url: "/dashboard",
        headers: [
          "X-Forwarded-For: 192.168.1.100",
          "X-Forwarded-Proto: https",
          "X-Auth-Request-User: alice@contoso.com",
          "X-Auth-Request-Email: alice@contoso.com",
          "X-Auth-Request-Groups: group-id-123",
        ],
        note: "Reconstructed example, not a capture; header names follow oauth2-proxy defaults. Caddy deleted any client-supplied copy of these headers before setting them. OTS accepts them only because the connection came from the proxy and is authenticated as such. Note what is not here: the access token. oauth2-proxy can forward it (--pass-access-token sets X-Auth-Request-Access-Token), but a backend that only needs to know who the user is has no use for a bearer token, and forwarding it widens the token\u2019s exposure to the app\u2019s logs, error reports, and any onward request it makes. Forward it only when the app actually calls an API with it.",
      },
      {
        type: "server-response",
        from: "OTS",
        to: "Browser (via Caddy)",
        status: "200 OK",
        headers: ["Content-Type: text/html"],
        note: "Dashboard HTML rendered with user context",
      },
    ],
    actors: {
      browser: true,
      caddy: true,
      logto: false,
      entra: false,
      ots: true,
    },
  },
  {
    id: 11,
    title: "Subsequent requests",
    userSees: "dashboard",
    urlBar: "https://secrets.example.com/dashboard",
    description:
      "All future requests follow the same pattern: session cookie \u2192 forward_auth \u2192 identity headers \u2192 OTS.",
    securityNote:
      "Session timeouts must be configured consistently across browser cookies, oauth2-proxy sessions, and application sessions to prevent security gaps. The header sanitization and the proxy-only reachability from step 10 apply to every request on this path, not just the first one: there is no fast path that skips them.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "Caddy",
        method: "GET",
        url: "https://secrets.example.com/dashboard",
        headers: ["Cookie: _oauth2_proxy=encrypted-session-data"],
      },
      {
        type: "internal",
        from: "Caddy",
        to: "oauth2-proxy",
        label: "forward_auth (fast path)",
        note: "Session valid \u2192 200 + headers (no redirects)",
      },
      {
        type: "server",
        from: "Caddy",
        to: "OTS",
        method: "GET",
        url: "/dashboard",
        headers: [
          "X-Auth-Request-User: alice@contoso.com",
          "X-Auth-Request-Email: alice@contoso.com",
        ],
        note: "Same sanitize-then-set rule as step 10, on every request",
      },
      {
        type: "server-response",
        from: "OTS",
        to: "Browser",
        status: "200 OK",
        body: '{"secrets": [...]}',
        note: "Normal API response",
      },
    ],
    actors: {
      browser: true,
      caddy: true,
      logto: false,
      entra: false,
      ots: true,
    },
  },
];

export { STEPS };
