<script lang="ts">
	/**
	 * SAML Single Logout with Okta
	 * OTS (SP) + Okta (IdP) + Team Wiki (second SP) via SAML 2.0 SLO
	 *
	 * SP-initiated Single Logout: OTS destroys its local session, sends a
	 * LogoutRequest to Okta, and Okta attempts front-channel propagation to
	 * other session participants. The Wiki's session survives -- the demo
	 * shows why SLO is best-effort, ending with the spec's own PartialLogout
	 * status code.
	 */

	import type { Component } from 'svelte';
	import SSODemoShell from '../shared/SSODemoShell.svelte';
	import Loading from '../screens/ots/Loading.svelte';
	import Dashboard from '../screens/ots/Dashboard.svelte';
	import SignedOut from '../screens/ots/SignedOut.svelte';
	import OktaSignOut from '../screens/idp/OktaSignOut.svelte';
	import { STEPS } from './steps.js';
	import { demoConfig } from './config.js';

	/**
	 * Screen mapping for this demo.
	 * Maps step.userSees values to screen components.
	 */
	const screens: Record<string, Component> = {
		loading: Loading,
		dashboard: Dashboard,
		'signed-out': SignedOut,
		'okta-signout': OktaSignOut,
	};
</script>

<!--
	SAML Single Logout with Okta Demo
	Uses the shared SSODemoShell with demo-specific steps, screens, and config.
-->
<SSODemoShell steps={STEPS} {screens} config={demoConfig} />
