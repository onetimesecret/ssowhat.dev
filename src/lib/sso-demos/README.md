# SSO Demo Components

> Part of [ssowhat.dev](https://github.com/onetimesecret/ssowhat.dev) — interactive SSO protocol visualizations.

Reusable Svelte 5 components for building step-by-step authentication flow demos. Each demo shows the same application protected by a different SSO architecture, with full HTTP transcript visibility.

## Quick Start: Creating a New Demo

1. **Copy the template:**
   ```bash
   cp -r src/lib/sso-demos/_template \
         src/lib/sso-demos/your-demo-name
   ```

2. **Update imports in `demo.svelte`:**
   ```svelte
   <script lang="ts">
     import SSODemoShell from '$lib/sso-demos/shared/SSODemoShell.svelte';
     import { Blank, Loading, Dashboard } from '$lib/sso-demos/screens/ots';
   </script>
   ```

3. **Customize your demo:**
   - `config.ts` - Define actors, protocol stack, and metadata
   - `steps.ts` - Define the authentication flow steps
   - `demo.svelte` - Wire up screens and export the component

4. **Create a SvelteKit route:**
   ```
   src/routes/your-demo-name/
   └── +page.svelte
   ```
   ```svelte
   <script lang="ts">
     import YourDemo from '$lib/sso-demos/your-demo-name/demo.svelte';
   </script>

   <svelte:head>
     <title>Your Demo Title</title>
   </svelte:head>

   <YourDemo />
   ```

## Available Components

### Core Components

| Component | Description |
|-----------|-------------|
| `SSODemoShell` | Main orchestrator with navigation, keyboard controls, autoplay |
| `HttpEntry` | HTTP message display with expandable payloads |
| `ActorDiagram` | Horizontal actor indicator strip |
| `ProtocolStack` | Protocol stack visualization |
| `BrowserMockup` | Browser chrome wrapper |

### OTS Screens (Constant Across Demos)

| Screen | Key | Description |
|--------|-----|-------------|
| `Blank` | `blank` | Initial redirect state ("Redirecting to login...") |
| `Loading` | `loading` | Processing state (spinner) |
| `Dashboard` | `dashboard` | Authenticated OTS dashboard |
| `TeamMembers` | `ots-team` | Team-members admin page; Alice SCIM-provisioned, active, never logged in |
| `TeamMembersDeactivated` | `ots-team-deactivated` | Team-members page after offboarding; Alice deactivated via SCIM |
| `SignedOut` | `signed-out` | Post-logout confirmation page ("You've been signed out") |
| `SignInDiscovery` | `signin` | Email-first sign-in page for home-realm discovery (accepts optional `email` prop) |
| `SignInDiscoveryAlice` | `signin-alice` | Discovery page with `alice@contoso.com` entered |
| `SignInDiscoveryBob` | `signin-bob` | Discovery page with `bob@acme.com` entered |
| `DashboardBob` | `dashboard-bob` | Dashboard as Bob from Acme (`Dashboard` accepts optional `email`/`initial` props) |

### IdP Screens (Pick Per Demo)

| Screen | Key | Description |
|--------|-----|-------------|
| `LogtoSignIn` | `logto-signin` | Logto OIDC provider login |
| `EntraLogin` | `entra-login` | Microsoft Entra ID login |
| `EntraAutoSubmit` | `entra-autosubmit` | Entra SAML auto-submit |
| `OktaLogin` | `okta-login` | Okta login page (accepts optional `username` prop) |
| `OktaLoginBob` | `okta-login-bob` | Okta login as Bob from Acme |
| `OktaDashboard` | `okta-dashboard` | Okta end-user dashboard with app tiles |
| `OktaAdminConsole` | `okta-admin` | Okta Admin Console, app Assignments tab |
| `OktaAdminProfile` | `okta-admin-profile` | Okta Admin Console user profile editor |
| `OktaSignOut` | `okta-signout` | Okta SLO propagation page; per-app sign-out status, one app unresponsive |
| `Auth0Universal` | `auth0-universal` | Auth0 Universal Login |
| `GoogleOAuth` | `google-oauth` | Google OAuth consent |
| `KeycloakLogin` | `keycloak-login` | Keycloak login page |

## Type Reference

### Step

```typescript
interface Step {
  id: number;                    // Step number displayed in UI
  title: string;                 // Short title
  userSees: string;              // Key into screens map
  urlBar: string;                // URL in browser mockup
  description: string;           // Detailed explanation
  securityNote?: string;         // Optional security tip
  http: HttpMessage[];           // HTTP messages in this step
  actors: Record<string, boolean>; // Which actors are active
  live?: LiveStepSpec;           // Optional live-transport spec (see below)
}
```

### HttpMessage

```typescript
interface HttpMessage {
  type: "request" | "response" | "internal" | "server" | "server-response";
  from: string;
  to: string;
  method?: string;               // GET, POST, etc.
  url?: string;
  headers?: string[];
  body?: string;
  note?: string;                 // Explanatory note
  status?: string;               // HTTP status (responses)
  label?: string;                // Label (internal processes)
  expandedPayload?: {            // Decoded content (SAML, JWT)
    label: string;
    content: string;
  };
}
```

### DemoConfig

```typescript
interface DemoConfig {
  title: string;                 // Demo title
  subtitle: string;              // Description
  version: string;               // Semantic version
  backLink: { href: string; label: string };
  actorConfig: ActorConfig[];    // Actor definitions
  protocolStack: ProtocolStackConfig;
  live?: LiveDemoConfig;         // Presence enables the Static/Live toggle
}
```

### ActorConfig

```typescript
interface ActorConfig {
  key: string;                   // Unique identifier
  label: string;                 // Display name
  activeColor: string;           // Tailwind bg color (e.g., "bg-blue-500")
}
```

### LiveExchangeSpec

```typescript
/**
 * One real HTTP exchange to perform against the mock-integration server in
 * live transport mode. References the static request/response pair in
 * Step.http that it replays, so live attribution can never drift from the
 * curated story. The executor renders results into the same HttpMessage
 * shape the UI already consumes -- one trace schema, two producers.
 */
interface LiveExchangeSpec {
  /** Index into Step.http of the static request message this exchange replays */
  staticRequestIndex: number;
  /** Index into Step.http of the static response message this exchange's response pairs with */
  staticResponseIndex: number;
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /**
   * Path + query relative to the mock server origin, e.g.
   * "/scim/v2/Users/{{userId}}". May contain {{placeholders}} resolved from
   * captured variables. Query strings are pre-encoded verbatim so they
   * byte-match the static URL encoding.
   */
  path: string;
  /**
   * Request headers as pre-formatted "Name: value" lines (the HttpMessage
   * convention). Authorization and X-Demo-Session are injected by the
   * executor -- do not list them here.
   */
  headers: string[];
  /**
   * Canonical request body -- the static expandedPayload.content verbatim,
   * with {{placeholders}} where server-assigned values appear.
   */
  body?: string;
  /**
   * Values to capture from the parsed response JSON: variable name to
   * dot-path (numeric segments index arrays), e.g. { userId: "id" }.
   * Captures apply only to 2xx responses.
   */
  capture?: Record<string, string>;
  /** Note for the live request card (defaults to the static message's note) */
  note?: string;
}
```

### LiveStepSpec

```typescript
/** Live-mode spec for a step. Absent = the step is static-only. */
interface LiveStepSpec {
  /** Real exchanges to perform, in order */
  exchanges: LiveExchangeSpec[];
  /**
   * Captured variables this step's exchanges consume, e.g. ["userId"].
   * When one is missing from the session context, the shell auto-runs the
   * earlier live step whose exchanges capture it before running this one,
   * and says so visibly.
   */
  requires?: string[];
}
```

### LiveExchangeResult

```typescript
/** Result of executing one LiveExchangeSpec against the mock server. */
interface LiveExchangeResult {
  /** The spec that was executed */
  spec: LiveExchangeSpec;
  /** The request actually sent, render-ready (type "server", from/to copied from the static twin) */
  request: HttpMessage;
  /** The response received, render-ready (type "server-response"); absent on network failure */
  response?: HttpMessage;
  /** Wall-clock round trip in milliseconds */
  durationMs: number;
  /** True when an HTTP response was received -- any status, including 4xx/5xx (those still render) */
  ok: boolean;
  /** Network/CORS/timeout failure description when ok is false */
  error?: string;
}
```

### LiveStepResult

```typescript
/** Result of running all live exchanges for one step. */
interface LiveStepResult {
  /** The step this result belongs to */
  stepId: number;
  /** Per-exchange results, in execution order */
  exchanges: LiveExchangeResult[];
  /** Variables captured during this step (merged into the session context) */
  captured: Record<string, string>;
  /** Step ids auto-run first to satisfy `requires` (empty when none) */
  ranPrerequisiteStepIds: number[];
  /** ISO timestamp of the run */
  at: string;
}
```

### LiveDemoConfig

```typescript
/**
 * Live-transport configuration for a demo. Presence enables the
 * Static/Live toggle; absence leaves the demo exactly as it was.
 */
interface LiveDemoConfig {
  /**
   * Mock server origin override. When absent, the runtime default applies:
   * the ssowhat:mock-server-url localStorage key, then the build-time
   * VITE_MOCK_SERVER_URL value, then http://localhost:8787.
   */
  baseUrl?: string;
}
```

## Live Transport Mode

Demos are static by default: every HTTP message is a curated fixture in `steps.ts`. A demo can additionally opt in to **live transport mode**, where selected steps replay their server-to-server exchanges against a real mock server and render the actual responses through the same `HttpMessage` shape — one trace schema, two producers.

Opting in takes two things:

1. **`config.ts`** — add `live: {}` to the `DemoConfig`. Presence of the `live` key enables the Static/Live toggle in the shell; `{}` means the runtime defaults apply (see `LiveDemoConfig`).
2. **`steps.ts`** — add a `live: LiveStepSpec` to each step that has replayable exchanges. Each `LiveExchangeSpec` points at the static request/response pair (by index into `Step.http`) that it replays; steps without a `live` spec simply stay static-only.

The static trace remains authoritative: SSR and the default view always render the static fixtures, navigation and autoplay never fire network requests, and live runs are explicit per-step user actions. The SCIM demo (`scim-okta/`) is the pilot.

The mock server's endpoint, session, and rate-limit contract is documented in [`packages/mock-server/README.md`](../../../packages/mock-server/README.md). The server origin resolves in this order: the `ssowhat:mock-server-url` localStorage key (runtime override), then `config.live.baseUrl`, then the build-time `VITE_MOCK_SERVER_URL` env value, then `http://localhost:8787`. Whatever wins must also be in the site's CSP `connect-src` allowlist (`src/app.html`) — the deployed build ships with `http://localhost:8787` and the hosted mock origin allowlisted, so the override switches between those without a rebuild; any other origin needs a CSP entry and a rebuild.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `ArrowLeft` | Previous step |
| `ArrowRight` | Next step |
| `Space` | Toggle autoplay |
| `T` | Toggle transcript view |
| `L` | Toggle Static/Live transport (live-capable demos only) |
| `R` | Restart demo |
| `1` / `2` / `3` | Playback speed (slow / normal / fast) |

## Adding New IdP Screens

1. Create the component in `screens/idp/`:
   ```svelte
   <!-- YourIdPLogin.svelte -->
   <div class="flex h-full items-center justify-center bg-slate-900">
     <!-- Your IdP login mockup -->
   </div>
   ```

2. Export from `screens/idp/index.ts`:
   ```typescript
   export { default as YourIdPLogin } from './YourIdPLogin.svelte';
   ```

3. Re-export from `index.ts`:
   ```typescript
   export { YourIdPLogin } from './screens/idp/index.js';
   ```

## Directory Structure

```
sso-demos/
├── _template/              # Copy to create new demos
│   ├── config.ts
│   ├── demo.svelte
│   └── steps.ts
├── screens/
│   ├── ots/                # OTS app screens (constant)
│   │   ├── Blank.svelte
│   │   ├── Dashboard.svelte
│   │   └── Loading.svelte
│   └── idp/                # IdP screens (pick per demo)
│       ├── EntraAutoSubmit.svelte
│       ├── EntraLogin.svelte
│       ├── LogtoSignIn.svelte
│       └── ...
├── shared/
│   ├── ActorDiagram.svelte
│   ├── BrowserMockup.svelte
│   ├── HttpEntry.svelte
│   ├── ProtocolStack.svelte
│   ├── SSODemoShell.svelte
│   ├── StepArticle.svelte
│   ├── TranscriptView.svelte
│   └── live/               # Live transport mode (opt-in per demo)
│       ├── config.ts       # Base-URL resolution + demo token
│       ├── executor.ts     # Replays LiveExchangeSpecs, renders HttpMessages
│       ├── diff.ts         # Field-level static-vs-live diff chips
│       ├── session.svelte.ts  # Runes session state (results, captures, backend)
│       ├── TransportToggle.svelte
│       ├── LiveStatusPill.svelte
│       ├── LiveRunControls.svelte
│       ├── LiveComparePanel.svelte
│       └── DiffChips.svelte
├── types.ts
└── index.ts
```
