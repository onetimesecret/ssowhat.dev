<script lang="ts">
	/**
	 * Multi-IdP Home-Realm Discovery
	 * One email-first sign-in page routes each organization to its own IdP.
	 *
	 * Alice (alice@contoso.com) is routed to Entra ID via OIDC;
	 * Bob (bob@acme.com) is routed to Okta via SAML 2.0. The demo focuses
	 * on the discovery decision and the realm-binding checks it requires.
	 */

	import type { Component } from 'svelte';
	import SSODemoShell from '../shared/SSODemoShell.svelte';
	import Loading from '../screens/ots/Loading.svelte';
	import Dashboard from '../screens/ots/Dashboard.svelte';
	import DashboardBob from '../screens/ots/DashboardBob.svelte';
	import SignInDiscovery from '../screens/ots/SignInDiscovery.svelte';
	import SignInDiscoveryAlice from '../screens/ots/SignInDiscoveryAlice.svelte';
	import SignInDiscoveryBob from '../screens/ots/SignInDiscoveryBob.svelte';
	import EntraLogin from '../screens/idp/EntraLogin.svelte';
	import OktaLoginBob from '../screens/idp/OktaLoginBob.svelte';
	import { STEPS } from './steps.js';
	import { demoConfig } from './config.js';

	/**
	 * Screen mapping for this demo.
	 * Maps step.userSees values to screen components.
	 */
	const screens: Record<string, Component> = {
		signin: SignInDiscovery,
		'signin-alice': SignInDiscoveryAlice,
		'signin-bob': SignInDiscoveryBob,
		'entra-login': EntraLogin,
		'okta-login-bob': OktaLoginBob,
		loading: Loading,
		dashboard: Dashboard,
		'dashboard-bob': DashboardBob,
	};
</script>

<!--
	Multi-IdP Home-Realm Discovery Demo
	Uses the shared SSODemoShell with demo-specific steps, screens, and config.
-->
<SSODemoShell steps={STEPS} {screens} config={demoConfig} />
