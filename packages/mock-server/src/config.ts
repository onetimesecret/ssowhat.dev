// packages/mock-server/src/config.ts

/**
 * Central constants for the mock SCIM server. Everything in this file is
 * public, deterministic teaching material -- there are no secrets anywhere
 * in this package, by design.
 */

/**
 * The demo Bearer token, verbatim from the static SCIM demo traces. The
 * `...redacted` characters are part of the token -- it is not an elision.
 *
 * This token is public teaching material from the static demo. It gates
 * nothing of value. This server holds no real data, mints no real
 * credentials, and must never be pointed at by anything trusted. Plain
 * string equality is deliberate -- constant-time comparison would be
 * theater for a public token.
 */
export const DEMO_TOKEN = 'ots_scim_tk_9f3a...redacted';

/** Sliding idle TTL for a demo session (30 minutes). */
export const SESSION_TTL_MS = 30 * 60 * 1000;

/** LRU cap on concurrently stored sessions. */
export const MAX_SESSIONS = 500;

/** Per-session user cap; POST beyond this returns a 409 envelope. */
export const MAX_USERS_PER_SESSION = 20;

/** Fixed rate-limit window length. */
export const RATE_WINDOW_MS = 60 * 1000;

/** Requests allowed per session per window. */
export const RATE_LIMIT_PER_SESSION = 30;

/** Requests allowed per client IP per window (checked before the session limit). */
export const RATE_LIMIT_PER_IP = 120;

/** Request body cap; larger bodies get a 413 SCIM envelope. */
export const BODY_LIMIT_BYTES = 64 * 1024;

/** Interval for the server entrypoint's expired-session sweep (server.ts only). */
export const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/** ServiceProviderConfig filter.maxResults (matches the static story's count=100). */
export const FILTER_MAX_RESULTS = 100;

/** Default CORS allowlist; override with the ALLOWED_ORIGINS env (comma-separated). */
export const DEFAULT_ALLOWED_ORIGINS = [
	'http://localhost:5184',
	'http://localhost:4173',
	'https://ssowhat.dev',
];

/** RFC 7643 core User schema URN. */
export const USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';

/** RFC 7644 ListResponse message URN. */
export const LIST_RESPONSE_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';

/** RFC 7644 PatchOp message URN. */
export const PATCH_OP_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:PatchOp';

/** RFC 7644 Error message URN. */
export const ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error';

/** RFC 7643 ServiceProviderConfig schema URN. */
export const SERVICE_PROVIDER_CONFIG_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig';
