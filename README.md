# ssowhat.dev

Interactive visualizations of enterprise SSO authentication flows. Step through every redirect, cookie, and token exchange to see what actually happens when a user clicks "Sign in with SSO."

**Live site:** [ssowhat.dev](https://ssowhat.dev)

## What this is

Each demo walks through a complete authentication flow step by step, showing what the user sees in the browser alongside the HTTP exchanges happening behind the scenes. Decoded SAML assertions, JWT tokens, and protocol details are shown at each stage.

The example application is [Onetime Secret](https://onetimesecret.com) (OTS) — an open-source tool for sharing sensitive information via self-destructing links. It serves as a realistic stand-in for any web application adding SSO support.

## Fidelity

The traces are reconstructed educational examples, not packet captures or implementation recipes. They are assembled from primary specifications and vendor documentation, then trimmed so the protocol is legible; endpoints, cookie names, redirects, headers, and response bodies vary by provider configuration and product version. The review dates record documentation review, not live interoperability testing. Where a demo simplifies something notable, such as the Okta Classic Engine Authentication API used in the SAML login sequences, the demo header says so.

## Available demos

| Demo | Protocols | Architecture |
|------|-----------|--------------|
| [Enterprise SAML for Modern Apps](https://ssowhat.dev/oidc-saml-bridge/) | OIDC, SAML | Caddy + Logto bridge OIDC to SAML with Entra ID |
| [SP-Initiated SAML with Okta](https://ssowhat.dev/sp-saml-okta/) | SAML 2.0 | OTS redirects to Okta, assertion posted back |
| [IdP-Initiated SAML with Okta](https://ssowhat.dev/idp-saml-okta/) | SAML 2.0 | User clicks Okta dashboard tile, unsolicited assertion pushed to OTS |
| [OAuth2 Social Login with Google](https://ssowhat.dev/oauth2-google/) | OAuth 2.0, OIDC | Authorization Code Flow with PKCE via Google |
| [SCIM Provisioning with Okta](https://ssowhat.dev/scim-okta/) | SCIM 2.0 | Okta pushes user lifecycle changes (create, update, deactivate) to the OTS SCIM API — live-mode pilot |
| [Enterprise OIDC with Entra ID](https://ssowhat.dev/oidc-entra/) | OIDC, OAuth 2.0 | OTS authenticates directly with Microsoft Entra ID via OpenID Connect |
| [SAML Single Logout with Okta](https://ssowhat.dev/slo-saml-okta/) | SAML 2.0 | One logout click, three sessions, and no guarantee all of them die |
| [Multi-IdP Home-Realm Discovery](https://ssowhat.dev/multi-idp-discovery/) | SAML 2.0, OIDC | One email-first sign-in page routes each organization to its own IdP |

## Running locally

```bash
pnpm install
pnpm dev
```

Open [localhost:5184](http://localhost:5184).

## Live mock-integration mode

The demos are curated static traces — the map. Demos that opt in can also replay their server-to-server calls against a real mock server — the territory — and show both side by side. Live results render through the same trace schema as the static fixtures: one schema, two producers. The SCIM demo is the pilot.

```bash
pnpm mock:dev
```

Then flip the Static/Live toggle in the demo. Live mode is opt-in per demo and per click; the site itself is fully static and never depends on the backend — when the server is unreachable, the static traces render exactly as before. Server contract: [packages/mock-server/README.md](packages/mock-server/README.md).

## Building

```bash
pnpm build
pnpm preview
```

Produces a fully static site in `build/` via `@sveltejs/adapter-static`.

## Creating a new demo

Copy the template and customize:

```bash
cp -r src/lib/sso-demos/_template src/lib/sso-demos/your-demo-name
```

Then create a route at `src/routes/your-demo-name/+page.svelte`. See the [component docs](src/lib/sso-demos/README.md) for the full guide.

## Tech stack

- [SvelteKit](https://svelte.dev/docs/kit) with static adapter
- [Svelte 5](https://svelte.dev) (runes)
- [Tailwind CSS v4](https://tailwindcss.com)
- TypeScript, Vite

## License

[MIT](LICENSE) — Onetime Secret Inc
