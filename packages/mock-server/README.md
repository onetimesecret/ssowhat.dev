# @ssowhat/mock-server

Deterministic mock-integration server for [ssowhat.dev](https://ssowhat.dev)'s live transport
mode (issue #8). It plays the OTS side of the SCIM 2.0 provisioning story: the browser replays
the demo's Okta requests against this server and renders the real responses next to the static
traces.

**Security posture, up front:** this server is safe to run publicly and safe to lose. It holds
no real data, mints no real credentials, and must never be pointed at by anything trusted. The
Bearer token (`ots_scim_tk_9f3a...redacted` — the `...redacted` characters are part of the
token, not an elision) is public teaching material from the static demo and gates nothing of
value; comparison is plain string equality on purpose, because constant-time comparison would
be theater for a public token. All state is in-memory, per-session, and evaporates on restart.
This is a teaching prop, never a real IdP or SCIM server.

## Running

From the repo root:

```sh
pnpm mock:dev          # tsx watch, http://localhost:8787
```

Or inside this package: `pnpm dev` (watch) / `pnpm start` (once) / `pnpm check` / `pnpm test`.

| Env var | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8787` | Listen port |
| `PUBLIC_BASE_URL` | `http://localhost:{PORT}` | Origin used **verbatim** in `Location` headers and `meta.location` |
| `ALLOWED_ORIGINS` | `http://localhost:5184, http://localhost:4173, https://ssowhat.dev` | Comma-separated CORS allowlist |

## Endpoints

All `/scim/v2/*` responses use `Content-Type: application/scim+json` and the middleware chain
**CORS → body-limit → rate-limit → session → auth → route**. Errors are RFC 7644 §3.12
envelopes with `status` as a JSON **string** (`{"schemas":[...Error],"status":"409",
"scimType":"uniqueness","detail":"..."}`); `scimType` appears only where the protocol defines
one.

| Route | Guards | Behavior |
| --- | --- | --- |
| `GET /healthz` | CORS only | Client probe target. `200 {"ok":true,"service":"ssowhat-mock-server"}` |
| `GET /scim/v2/ServiceProviderConfig` | all | Static config: `patch.supported:true`, `filter:{supported:true,maxResults:100}`, `etag.supported:false` (we emit `meta.version` but never an ETag header and never honor `If-Match`), bulk/sort/changePassword false |
| `GET /scim/v2/Users` | all | Optional `filter` (see grammar below). No filter → all session users. No match → `200` empty ListResponse **byte-identical to the static step-2 body**. `startIndex` echoed; `count` accepted (≤20 users, no real pagination) |
| `POST /scim/v2/Users` | all | Requires core User URN in `schemas` + `userName`, else `400 invalidValue`. Duplicate userName (case-insensitive, stored as sent) → `409 uniqueness`. Client-sent `id`/`meta`/`password` stripped; a password is never stored or echoed. Assigns a fresh UUID id (never the static fixture id), `meta.version` `W/"1"`, second-precision UTC timestamps. `201` + `Location` header |
| `GET /scim/v2/Users/:id` | all | `200` full resource or `404` |
| `PUT /scim/v2/Users/:id` | all | Full replace: attributes absent from the body are **cleared**; body `id`/`meta` ignored (path id authoritative); `meta.created` preserved; version +1. No `If-Match` — last-write-wins, as the static story says. `200` |
| `PATCH /scim/v2/Users/:id` | all | Requires PatchOp URN. Supports `replace` with no `path` (object value merged at the resource root — Okta's deactivation shape) and `replace` with `path:"active"`; `op`/`path` case-insensitive. Anything else → `400 invalidPath`. Version +1 per successful request, even when re-applying the same change. `200` + full resource |
| `DELETE /scim/v2/Users/:id` | all | `204` or `404`. Spec compliance; not reachable from any static step |
| `DELETE /api/session` | CORS, body-limit, rate-limit, session | Drops the session. Valid `X-Demo-Session` only — **no bearer**. `204` |

**Filter grammar** — a whitelist, not a parser: exactly `userName eq "value"` (attribute name
case-insensitive, extra whitespace tolerated, value matched case-insensitively). Anything else
— other attributes, other operators, unparseable input — is `400 invalidFilter`. This is the
static demo's "treat the filter as untrusted input" lesson enforced by construction.

**Canonical serialization** — responses match the static `expandedPayload` layout so live/static
diffs are value-level, not layout-level: key order
`schemas, id, externalId, userName, name, displayName, emails, active, meta`, 2-space JSON,
`schemas` arrays inlined, `meta.version` as weak `W/"n"` (no ETag header), timestamps as
second-precision UTC (`2024-01-15T10:31:02Z` format).

## Session model

- Every `/scim/v2/*` request needs `X-Demo-Session: <UUID v4>` (client-minted via
  `crypto.randomUUID()`; the version nibble is enforced). Missing/malformed → `400`.
- Sessions are created **lazily** on first valid request, empty — nothing is seeded, which is
  why a fresh session's step-2 filter returns `totalResults: 0` exactly like the static trace.
- **30-minute sliding TTL** (refreshed on every request), **500-session LRU cap**,
  **20 users per session** (`409` beyond that). Expired sessions are evicted opportunistically
  on access plus a 5-minute sweep in the Node entrypoint (`server.ts` — the app factory in
  `app.ts` stays timer-free and portable).
- An evicted session is not an error: the next request lazily recreates it empty, and the demo
  degrades to its step-2 state. Reset = mint a new UUID client-side (or `DELETE /api/session`).

## Limits

| Guard | Limit | Response |
| --- | --- | --- |
| Rate, per client IP (checked first) | 120 req/min, fixed 60s windows | `429` + `Retry-After` |
| Rate, per session | 30 req/min, fixed 60s windows | `429` + `Retry-After` |
| Request body | 64 KB | `413` envelope |

## How this maps to the app's trace contract

The browser is the SCIM client. The app's live executor
(`src/lib/sso-demos/shared/live/executor.ts`) replays each static `type:"server"` request from
`Step.http` against this server and renders both legs in the same `HttpMessage` shape the static
traces use (see the Type Reference in
[`src/lib/sso-demos/README.md`](../../src/lib/sso-demos/README.md)):

- request leg → `type:"server"`, `from:"Okta"` / `to:"OTS"` copied from the static twin, headers
  as pre-formatted `Name: value` lines including the demo `Authorization` line and the live-only
  `X-Demo-Session` line (rendered honestly, excluded from diffs);
- response leg → `type:"server-response"`, `status` like `"201 Created"`, headers reduced to
  `Content-Type` and `Location`, body re-serialized as 2-space JSON.

Because this server byte-matches the static fixtures everywhere it can, the only permitted
static↔live differences are the server-owned values: resource `id`, `meta.created`,
`meta.lastModified`, `meta.version`, and the URL origin. Anything else that differs is a bug in
this package — and the test suite (`pnpm --filter @ssowhat/mock-server test`, in-process via
`app.request()`, no listener) is what enforces that.
