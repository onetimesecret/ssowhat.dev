<script lang="ts">
	/**
	 * IdP-Initiated SAML with Okta
	 * Okta (IdP) pushes an unsolicited assertion to OTS (SP)
	 *
	 * The user starts at the Okta dashboard and clicks the OTS app tile.
	 * Okta generates a signed SAML Response with no corresponding
	 * AuthnRequest -- and therefore no InResponseTo -- and posts it to
	 * OTS's ACS endpoint.
	 *
	 * Mirror image of the SP-initiated demo: same actors, same bindings
	 * on the response leg, but the SP loses request correlation and all
	 * the validation that depends on it.
	 */

	import type { Component } from 'svelte';
	import SSODemoShell from '../shared/SSODemoShell.svelte';
	import Loading from '../screens/ots/Loading.svelte';
	import Dashboard from '../screens/ots/Dashboard.svelte';
	import OktaLogin from '../screens/idp/OktaLogin.svelte';
	import OktaDashboard from '../screens/idp/OktaDashboard.svelte';
	import { STEPS } from './steps.js';
	import { demoConfig } from './config.js';

	/**
	 * Screen mapping for this demo.
	 * Maps step.userSees values to screen components.
	 */
	const screens: Record<string, Component> = {
		loading: Loading,
		dashboard: Dashboard,
		'okta-login': OktaLogin,
		'okta-dashboard': OktaDashboard,
	};
</script>

<!--
	IdP-Initiated SAML with Okta Demo
	Uses the shared SSODemoShell with demo-specific steps, screens, and config.
-->
<SSODemoShell steps={STEPS} {screens} config={demoConfig} />
