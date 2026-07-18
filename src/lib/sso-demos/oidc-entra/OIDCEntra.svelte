<script lang="ts">
	/**
	 * Enterprise OIDC with Entra ID
	 * OTS + Microsoft Entra ID via OAuth 2.0 / OIDC
	 *
	 * The same Authorization Code + PKCE flow as the Google demo, pointed at
	 * a workforce tenant: tenant-scoped endpoints, admin consent instead of a
	 * user consent screen, Conditional Access at sign-in, and enterprise
	 * claims (tid, oid) as the stable identity key.
	 */

	import type { Component } from 'svelte';
	import SSODemoShell from '../shared/SSODemoShell.svelte';
	import Blank from '../screens/ots/Blank.svelte';
	import Loading from '../screens/ots/Loading.svelte';
	import Dashboard from '../screens/ots/Dashboard.svelte';
	import EntraLogin from '../screens/idp/EntraLogin.svelte';
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
		'entra-login': EntraLogin,
	};
</script>

<!--
	Direct Entra ID OIDC Demo
	Uses the shared SSODemoShell with demo-specific steps, screens, and config.
-->
<SSODemoShell steps={STEPS} {screens} config={demoConfig} />
