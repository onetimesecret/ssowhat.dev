<script lang="ts">
	/**
	 * OIDC->SAML Bridge via Forward Auth
	 * Caddy + Logto + Entra ID
	 *
	 * SP-initiated flow with external auth gateway and protocol bridging.
	 *
	 * This demo shows OIDC-to-SAML protocol translation for enterprise SSO.
	 * The application (OTS) uses OIDC, while the enterprise IdP (Entra ID) uses SAML.
	 * Logto bridges the protocols, and Caddy enforces authentication at the gateway.
	 *
	 * Technology Stack: Caddy (reverse proxy with forward_auth), Logto
	 * (OIDC provider + SAML SP), Entra ID (SAML IdP).
	 * Some implementation details are specific to these technologies, though the
	 * overall pattern applies to similar stacks.
	 */

	import type { Component } from 'svelte';
	import SSODemoShell from '../shared/SSODemoShell.svelte';
	import Blank from '../screens/ots/Blank.svelte';
	import Loading from '../screens/ots/Loading.svelte';
	import Dashboard from '../screens/ots/Dashboard.svelte';
	import LogtoSignIn from '../screens/idp/LogtoSignIn.svelte';
	import EntraLogin from '../screens/idp/EntraLogin.svelte';
	import EntraAutoSubmit from '../screens/idp/EntraAutoSubmit.svelte';
	import { STEPS } from './steps.js';
	import { demoConfig } from './config.js';

	/**
	 * Screen mapping for this demo.
	 * Maps step.userSees values to screen components.
	 */
	const screens: Record<string, Component> = {
		blank: Blank,
		loading: Loading,
		dashboard: Dashboard,
		'logto-signin': LogtoSignIn,
		'entra-login': EntraLogin,
		'entra-autosubmit': EntraAutoSubmit,
	};
</script>

<!--
	OIDC-SAML Bridge Demo
	Uses the shared SSODemoShell with demo-specific steps, screens, and config.
-->
<SSODemoShell steps={STEPS} {screens} config={demoConfig} />
