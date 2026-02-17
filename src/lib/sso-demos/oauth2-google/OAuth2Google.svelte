<script lang="ts">
	/**
	 * OAuth2 Social Login with Google
	 * OTS + Google via OAuth 2.0 / OIDC
	 *
	 * Standard Authorization Code Flow: OTS redirects unauthenticated users
	 * to Google's authorization endpoint. After authentication and consent,
	 * Google redirects back with an authorization code. OTS exchanges the
	 * code server-to-server for an ID token (JWT) containing the user's identity.
	 *
	 * This is the most common pattern for "Sign in with Google" integrations.
	 */

	import type { Component } from 'svelte';
	import SSODemoShell from '../shared/SSODemoShell.svelte';
	import Blank from '../screens/ots/Blank.svelte';
	import Loading from '../screens/ots/Loading.svelte';
	import Dashboard from '../screens/ots/Dashboard.svelte';
	import GoogleOAuth from '../screens/idp/GoogleOAuth.svelte';
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
		'google-oauth': GoogleOAuth,
	};
</script>

<!--
	OAuth2 Google Social Login Demo
	Uses the shared SSODemoShell with demo-specific steps, screens, and config.
-->
<SSODemoShell steps={STEPS} {screens} config={demoConfig} />
