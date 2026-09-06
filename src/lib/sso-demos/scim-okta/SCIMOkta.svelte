<script lang="ts">
	/**
	 * SCIM Provisioning with Okta
	 * Okta (provisioning client) drives the user lifecycle in the app (SCIM server)
	 *
	 * The admin assigns Alice to the app in the Okta Admin Console;
	 * everything after that is server-to-server REST -- lookup by filter,
	 * POST /Users to create, PUT full-replace on profile change, group
	 * push, and a PatchOp flipping active to false at offboarding.
	 *
	 * Fundamentally different from the auth demos: no end-user browser in
	 * the protocol at all. Provisioning is not authentication -- SCIM
	 * creates the account, SAML signs into it, and they rendezvous on the
	 * userName / NameID email address.
	 */

	import type { Component } from 'svelte';
	import SSODemoShell from '../shared/SSODemoShell.svelte';
	import TeamMembers from '../screens/ots/TeamMembers.svelte';
	import TeamMembersDeactivated from '../screens/ots/TeamMembersDeactivated.svelte';
	import OktaAdminConsole from '../screens/idp/OktaAdminConsole.svelte';
	import OktaAdminProfile from '../screens/idp/OktaAdminProfile.svelte';
	import { STEPS } from './steps.js';
	import { demoConfig } from './config.js';

	/**
	 * Screen mapping for this demo.
	 * Maps step.userSees values to screen components.
	 */
	const screens: Record<string, Component> = {
		'okta-admin': OktaAdminConsole,
		'okta-admin-profile': OktaAdminProfile,
		'ots-team': TeamMembers,
		'ots-team-deactivated': TeamMembersDeactivated,
	};
</script>

<!--
	SCIM Provisioning with Okta Demo
	Uses the shared SSODemoShell with demo-specific steps, screens, and config.
-->
<SSODemoShell steps={STEPS} {screens} config={demoConfig} />
