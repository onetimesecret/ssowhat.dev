<script lang="ts">
	/**
	 * SP-Initiated SAML with Okta
	 * OTS (SP) + Okta (IdP) via SAML 2.0
	 *
	 * Direct SP-initiated flow: OTS redirects unauthenticated users to Okta
	 * via SAML AuthnRequest, Okta authenticates and posts a signed SAML
	 * assertion back to OTS's ACS endpoint.
	 *
	 * This is the simplest enterprise SSO pattern: direct SAML between
	 * application and IdP with no intermediate proxy or protocol bridge.
	 */

	import type { Component } from 'svelte';
	import SSODemoShell from '../shared/SSODemoShell.svelte';
	import Blank from '../screens/ots/Blank.svelte';
	import Loading from '../screens/ots/Loading.svelte';
	import Dashboard from '../screens/ots/Dashboard.svelte';
	import OktaLogin from '../screens/idp/OktaLogin.svelte';
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
		'okta-login': OktaLogin,
	};
</script>

<!--
	SP-Initiated SAML with Okta Demo
	Uses the shared SSODemoShell with demo-specific steps, screens, and config.
-->
<SSODemoShell steps={STEPS} {screens} config={demoConfig} />
