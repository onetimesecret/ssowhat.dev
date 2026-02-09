<script lang="ts">
  // src/lib/sso-demos/_template/Demo.svelte
  //
  // Template: Copy this directory to create a new demo (e.g., sso-demos/my-demo/).
  //
  // Steps to create a new demo:
  // 1. Copy this entire _template directory to a new location:
  //    e.g., src/lib/sso-demos/my-new-demo/
  // 2. Customize config.ts with your actors and protocol stack
  // 3. Customize steps.ts with your authentication flow
  // 4. Update the screens map below with the screens your demo uses
  // 5. Create a SvelteKit route page to host the demo (see +page.svelte)

  import type { Component } from 'svelte';
  import SSODemoShell from '$lib/sso-demos/shared/SSODemoShell.svelte';
  // OTS screens (constant across demos)
  import { Blank, Loading, Dashboard } from '$lib/sso-demos/screens/ots';
  // IdP screens (pick what you need)
  // import { LogtoSignIn } from '$lib/sso-demos/screens/idp';
  // import { EntraLogin, EntraAutoSubmit } from '$lib/sso-demos/screens/idp';
  // import { OktaLogin } from '$lib/sso-demos/screens/idp';
  // import { Auth0Universal } from '$lib/sso-demos/screens/idp';
  // import { GoogleOAuth } from '$lib/sso-demos/screens/idp';
  // import { KeycloakLogin } from '$lib/sso-demos/screens/idp';

  import { STEPS } from './steps.js';
  import { demoConfig } from './config.js';

  /**
   * Screen mapping for this demo.
   * Maps step.userSees values to Svelte screen components.
   *
   * Available screens from screens/:
   *
   * OTS (always available):
   * - Blank: Initial redirect state
   * - Loading: Processing/redirecting state
   * - Dashboard: Authenticated OTS dashboard
   *
   * IdP screens (import as needed):
   * - LogtoSignIn: Logto OIDC provider login
   * - EntraLogin: Microsoft Entra ID login
   * - EntraAutoSubmit: Entra SAML auto-submit
   * - OktaLogin: Okta login page
   * - Auth0Universal: Auth0 Universal Login
   * - GoogleOAuth: Google OAuth consent
   * - KeycloakLogin: Keycloak login page
   */
  const screens: Record<string, Component> = {
    blank: Blank,
    loading: Loading,
    dashboard: Dashboard,
    // Add your IdP screens here:
    // "logto-signin": LogtoSignIn,
    // "okta-login": OktaLogin,
  };
</script>

<!--
  Your Demo Component
  Rename this file to match your demo.
-->
<SSODemoShell steps={STEPS} {screens} config={demoConfig} />
