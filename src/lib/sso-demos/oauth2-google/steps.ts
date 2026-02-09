// src/lib/sso-demos/oauth2-google/steps.ts

import type { Step } from '$lib/sso-demos';

/**
 * OAuth2 Authorization Code flow with PKCE and Google as the OIDC Provider.
 *
 * OTS redirects unauthenticated users to Google's authorization endpoint
 * with PKCE challenge parameters. After the user authenticates and consents,
 * Google redirects back with an authorization code. OTS exchanges the code
 * server-to-server (with code_verifier) for tokens including an ID token JWT,
 * then optionally calls the userinfo endpoint for additional profile data.
 *
 * This is the Authorization Code Flow with PKCE (RFC 7636) combined with
 * OpenID Connect Core 1.0 -- the standard pattern for "Sign in with Google".
 */
export const STEPS: Step[] = [
  {
    id: 1,
    title: "User clicks Sign in with Google",
    userSees: "blank",
    urlBar: "https://secrets.example.com/dashboard",
    description:
      "User navigates to the OTS dashboard or clicks 'Sign in with Google'. OTS checks for a valid session and finds none, so it generates PKCE parameters (code_verifier + code_challenge), a random state for CSRF protection, and a nonce for token replay prevention, then redirects to Google's authorization endpoint.",
    securityNote:
      "PKCE (Proof Key for Code Exchange, RFC 7636) protects against authorization code interception attacks. OTS generates a random code_verifier (43-128 chars), computes code_challenge = BASE64URL(SHA256(code_verifier)), and sends only the challenge to Google. The verifier is stored server-side and sent during token exchange. The state parameter prevents CSRF; the nonce prevents ID token replay.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "OTS",
        method: "GET",
        url: "https://secrets.example.com/dashboard",
        headers: ["Cookie: (none)"],
        note: "No session cookie present",
      },
      {
        type: "internal",
        from: "OTS",
        to: "OTS",
        label: "Generate OAuth2 parameters",
        note: "Generate code_verifier (random 43-char string), compute code_challenge = BASE64URL(SHA256(code_verifier)), generate random state and nonce. Store all three server-side keyed by session.",
      },
      {
        type: "response",
        from: "OTS",
        to: "Browser",
        status: "302 Found",
        headers: [
          "Location: https://accounts.google.com/o/oauth2/v2/auth?",
          "  client_id=123456789.apps.googleusercontent.com",
          "  &redirect_uri=https://secrets.example.com/auth/callback",
          "  &response_type=code",
          "  &scope=openid email profile",
          "  &state=xYz9Kp2mN7qR4sT1",
          "  &nonce=aB3cD5eF7gH9iJ1k",
          "  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
          "  &code_challenge_method=S256",
          "  &access_type=offline",
          "  &prompt=consent",
        ],
        note: "Redirect to Google with PKCE challenge, state, and nonce",
      },
    ],
    actors: {
      browser: true,
      ots: true,
      google: false,
    },
  },
  {
    id: 2,
    title: "Browser arrives at Google OAuth consent",
    userSees: "google-oauth",
    urlBar: "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
    description:
      "Browser follows the redirect to Google. If the user is already signed into Google, they see the OAuth consent screen showing which permissions OTS is requesting (email, profile). Otherwise, they see the Google sign-in page first.",
    securityNote:
      "Google validates that the redirect_uri exactly matches one registered in the Google Cloud Console for this client_id. Mismatched redirect URIs are rejected, preventing authorization code theft via open redirectors. The scope 'openid' triggers OIDC and returns an id_token alongside the access_token.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "Google",
        method: "GET",
        url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=123456789.apps.googleusercontent.com&redirect_uri=...&response_type=code&scope=openid+email+profile&state=xYz9Kp2mN7qR4sT1&nonce=aB3cD5eF7gH9iJ1k&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256",
        headers: [],
      },
      {
        type: "response",
        from: "Google",
        to: "Browser",
        status: "200 OK",
        headers: [
          "Content-Type: text/html",
          "Set-Cookie: __Host-GAPS=...; HttpOnly; Secure; SameSite=None",
        ],
        note: "Google sign-in / OAuth consent page rendered",
      },
    ],
    actors: {
      browser: true,
      ots: false,
      google: true,
    },
  },
  {
    id: 3,
    title: "User authenticates and grants consent",
    userSees: "google-oauth",
    urlBar: "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
    description:
      "User signs into their Google account (if not already signed in) and approves the requested permissions. Google issues a single-use authorization code and redirects the browser back to OTS's callback URL with the code and the original state parameter.",
    securityNote:
      "The authorization code is short-lived (typically 10 minutes) and single-use. Google includes the state parameter unchanged in the redirect, allowing OTS to verify it matches the value from step 1. If state doesn't match, OTS must reject the request as a potential CSRF attack.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "Google",
        method: "POST",
        url: "https://accounts.google.com/signin/oauth/consent",
        headers: [
          "Content-Type: application/x-www-form-urlencoded",
          "Cookie: __Host-GAPS=...",
        ],
        body: "approved=true&...",
        note: "User grants consent for email and profile access",
      },
      {
        type: "response",
        from: "Google",
        to: "Browser",
        status: "302 Found",
        headers: [
          "Location: https://secrets.example.com/auth/callback?code=4/0AeanS0a...&state=xYz9Kp2mN7qR4sT1",
        ],
        note: "Authorization code issued, redirect back to OTS with state for CSRF validation",
      },
    ],
    actors: {
      browser: true,
      ots: false,
      google: true,
    },
  },
  {
    id: 4,
    title: "OTS exchanges code for tokens (back-channel)",
    userSees: "loading",
    urlBar: "https://secrets.example.com/auth/callback?code=4/0AeanS0a...&state=xYz9Kp2mN7qR4sT1",
    description:
      "Browser follows the redirect back to OTS. OTS validates the state parameter, then exchanges the authorization code for tokens via a server-to-server POST to Google's token endpoint. The code_verifier (PKCE proof) is included to prove OTS is the same party that initiated the flow.",
    securityNote:
      "The token exchange is server-to-server (back-channel), so the browser never sees the tokens. OTS sends both the client_secret (confidential client authentication) and the code_verifier (PKCE proof). Google verifies BASE64URL(SHA256(code_verifier)) matches the code_challenge from step 1. This dual verification prevents both code interception and client impersonation.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "OTS",
        method: "GET",
        url: "https://secrets.example.com/auth/callback?code=4/0AeanS0a...&state=xYz9Kp2mN7qR4sT1",
        headers: [],
      },
      {
        type: "internal",
        from: "OTS",
        to: "OTS",
        label: "Validate state parameter",
        note: "Confirm state=xYz9Kp2mN7qR4sT1 matches the value stored in step 1. Retrieve code_verifier from server-side session.",
      },
      {
        type: "server",
        from: "OTS",
        to: "Google",
        label: "Server-to-server token exchange",
        method: "POST",
        url: "https://oauth2.googleapis.com/token",
        headers: ["Content-Type: application/x-www-form-urlencoded"],
        body: "grant_type=authorization_code\n&code=4/0AeanS0a...\n&redirect_uri=https://secrets.example.com/auth/callback\n&client_id=123456789.apps.googleusercontent.com\n&client_secret=GOCSPX-...\n&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
        note: "Browser never sees this request. code_verifier proves PKCE ownership.",
      },
      {
        type: "server-response",
        from: "Google",
        to: "OTS",
        status: "200 OK",
        body: `{
  "access_token": "ya29.a0AfB_byC...",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3599,
  "refresh_token": "1//0eXyz...",
  "scope": "openid email profile"
}`,
        expandedPayload: {
          label: "Decoded id_token (JWT)",
          content: `// Header
{
  "alg": "RS256",
  "kid": "f05415b13acb9b9a46ae",
  "typ": "JWT"
}

// Payload
{
  "iss": "https://accounts.google.com",
  "azp": "123456789.apps.googleusercontent.com",
  "aud": "123456789.apps.googleusercontent.com",
  "sub": "110248495921238986420",
  "email": "alice@gmail.com",
  "email_verified": true,
  "at_hash": "HK6E_P6Dh8Y93mRNtsDB1Q",
  "nonce": "aB3cD5eF7gH9iJ1k",
  "name": "Alice Smith",
  "picture": "https://lh3.googleusercontent.com/a/...",
  "given_name": "Alice",
  "family_name": "Smith",
  "iat": 1705320060,
  "exp": 1705323660
}

// Signature: RS256 signed with Google's private key
// Verify with JWKS: https://www.googleapis.com/oauth2/v3/certs`,
        },
        note: "Token response includes access_token for API calls and id_token (JWT) with verified identity",
      },
    ],
    actors: {
      browser: true,
      ots: true,
      google: true,
    },
  },
  {
    id: 5,
    title: "OTS validates ID token and fetches userinfo",
    userSees: "loading",
    urlBar: "https://secrets.example.com/auth/callback?code=4/0AeanS0a...&state=xYz9Kp2mN7qR4sT1",
    description:
      "OTS validates the ID token JWT (signature, issuer, audience, nonce, expiry) using Google's public keys. It then optionally calls the userinfo endpoint with the access_token to fetch additional profile data that may not be in the ID token.",
    securityNote:
      "ID token validation checks: (1) verify RS256 signature against Google's JWKS at https://www.googleapis.com/oauth2/v3/certs, (2) iss must be 'https://accounts.google.com', (3) aud must match your client_id, (4) exp must be in the future, (5) nonce must match the value from step 1 to prevent replay. Cache JWKS with appropriate TTL to avoid fetching on every request.",
    http: [
      {
        type: "internal",
        from: "OTS",
        to: "OTS",
        label: "Validate ID token JWT",
        note: "Verify RS256 signature via Google JWKS, check iss, aud, exp, nonce=aB3cD5eF7gH9iJ1k. Extract sub=110248495921238986420 as stable user identifier.",
      },
      {
        type: "server",
        from: "OTS",
        to: "Google",
        label: "Fetch additional profile data",
        method: "GET",
        url: "https://www.googleapis.com/oauth2/v3/userinfo",
        headers: [
          "Authorization: Bearer ya29.a0AfB_byC...",
        ],
        note: "Optional: fetch profile data not included in the ID token",
      },
      {
        type: "server-response",
        from: "Google",
        to: "OTS",
        status: "200 OK",
        body: `{
  "sub": "110248495921238986420",
  "name": "Alice Smith",
  "given_name": "Alice",
  "family_name": "Smith",
  "picture": "https://lh3.googleusercontent.com/a/...",
  "email": "alice@gmail.com",
  "email_verified": true,
  "locale": "en"
}`,
        note: "Userinfo response with additional profile claims (locale, picture URL)",
      },
      {
        type: "response",
        from: "OTS",
        to: "Browser",
        status: "302 Found",
        headers: [
          "Location: https://secrets.example.com/dashboard",
          "Set-Cookie: _ots_session=encrypted-session-data; HttpOnly; Secure; SameSite=Lax; Path=/",
        ],
        note: "Session created from OIDC claims, redirect to original destination",
      },
    ],
    actors: {
      browser: true,
      ots: true,
      google: true,
    },
  },
  {
    id: 6,
    title: "User reaches authenticated dashboard",
    userSees: "dashboard",
    urlBar: "https://secrets.example.com/dashboard",
    description:
      "The user is authenticated and reaches their dashboard. OTS reads the session to render content personalized with the Google profile data (name, email, avatar).",
    securityNote:
      "The access_token and refresh_token are stored securely server-side, never exposed to the browser. The refresh_token allows OTS to obtain new access tokens without user interaction, useful for background API calls. Revoke tokens on logout via https://oauth2.googleapis.com/revoke.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "OTS",
        method: "GET",
        url: "https://secrets.example.com/dashboard",
        headers: ["Cookie: _ots_session=encrypted-session-data"],
      },
      {
        type: "internal",
        from: "OTS",
        to: "OTS",
        label: "Decrypt session cookie",
        note: "Extract user identity: alice@gmail.com (Google sub: 110248495921238986420)",
      },
      {
        type: "response",
        from: "OTS",
        to: "Browser",
        status: "200 OK",
        headers: [
          "Content-Type: text/html",
          "Content-Security-Policy: default-src 'self'",
          "X-Content-Type-Options: nosniff",
        ],
        note: "Dashboard rendered with user context from Google OIDC claims",
      },
    ],
    actors: {
      browser: true,
      ots: true,
      google: false,
    },
  },
  {
    id: 7,
    title: "Subsequent requests use session cookie",
    userSees: "dashboard",
    urlBar: "https://secrets.example.com/dashboard",
    description:
      "All future requests use the session cookie. No further interaction with Google until the session expires or the user logs out. OTS can use the stored refresh_token to call Google APIs on behalf of the user if needed.",
    securityNote:
      "Session lifetime should be managed independently of Google token expiry. Implement session rotation on privilege escalation. On logout, revoke the Google tokens to prevent lingering API access. Store tokens encrypted at rest with a server-side key, never in browser-accessible storage.",
    http: [
      {
        type: "request",
        from: "Browser",
        to: "OTS",
        method: "GET",
        url: "https://secrets.example.com/api/secrets",
        headers: [
          "Cookie: _ots_session=encrypted-session-data",
          "Accept: application/json",
        ],
      },
      {
        type: "internal",
        from: "OTS",
        to: "OTS",
        label: "Validate session (fast path)",
        note: "Session valid, no Google interaction needed. User: alice@gmail.com",
      },
      {
        type: "response",
        from: "OTS",
        to: "Browser",
        status: "200 OK",
        headers: ["Content-Type: application/json"],
        body: '{"secrets": [...], "user": "alice@gmail.com"}',
        note: "Normal API response, no OAuth2 roundtrip needed",
      },
    ],
    actors: {
      browser: true,
      ots: true,
      google: false,
    },
  },
];
