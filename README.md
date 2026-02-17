# ssowhat.dev

Interactive visualizations of enterprise SSO authentication flows. Step through every redirect, cookie, and token exchange to see what actually happens when a user clicks "Sign in with SSO."

**Live site:** [ssowhat.dev](https://ssowhat.dev)

## What this is

Each demo walks through a complete authentication flow step by step, showing what the user sees in the browser alongside the HTTP exchanges happening behind the scenes. Decoded SAML assertions, JWT tokens, and protocol details are shown at each stage.

The example application is [Onetime Secret](https://onetimesecret.com) (OTS) — an open-source tool for sharing sensitive information via self-destructing links. It serves as a realistic stand-in for any web application adding SSO support.

## Available demos

| Demo | Protocols | Architecture |
|------|-----------|--------------|
| [Enterprise SAML for Modern Apps](https://ssowhat.dev/oidc-saml-bridge/) | OIDC, SAML | Caddy + Logto bridge OIDC to SAML with Entra ID |
| [SP-Initiated SAML with Okta](https://ssowhat.dev/sp-saml-okta/) | SAML 2.0 | OTS redirects to Okta, assertion posted back |
| [OAuth2 Social Login with Google](https://ssowhat.dev/oauth2-google/) | OAuth 2.0, OIDC | Authorization Code Flow with PKCE via Google |

Planned: SCIM provisioning flows, multi-IdP federation patterns.

## Running locally

```bash
pnpm install
pnpm dev
```

Open [localhost:5184](http://localhost:5184).

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
