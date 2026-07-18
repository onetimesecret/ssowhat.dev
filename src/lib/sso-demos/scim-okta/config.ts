// src/lib/sso-demos/scim-okta/config.ts

import type { DemoConfig, ActorConfig, ProtocolStackConfig } from '$lib/sso-demos';
import { DEMOS_INDEX_PATH } from '$lib/sso-demos';

/**
 * Actor configuration for the SCIM provisioning demo.
 * Unlike the auth demos, the browser here belongs to the Okta ADMIN, not the
 * end user. Alice never touches a browser in this flow -- her account is
 * created, updated, and deactivated entirely by server-to-server REST calls
 * from Okta (the provisioning client) to OTS (the SCIM server).
 *
 * Colors use semantic classes from sso-demo-theme.css (bg-actor-*).
 * To customize actor colors, modify the theme file.
 */
export const actorConfig: ActorConfig[] = [
	{ key: 'browser', label: 'Admin Browser', activeColor: 'bg-actor-browser' },
	{ key: 'okta', label: 'Okta', activeColor: 'bg-actor-okta' },
	{ key: 'ots', label: 'OTS', activeColor: 'bg-actor-ots' },
];

/**
 * Protocol stack configuration showing the architecture.
 * Okta is the SCIM client (it initiates every call); OTS is the SCIM server
 * (it exposes /scim/v2 and owns the resources). This inverts the intuition
 * from the SAML demos, where Okta is the authority: in SCIM, Okta is just an
 * HTTP client hitting the application's API.
 */
export const protocolStack: ProtocolStackConfig = {
	components: [
		{
			key: 'okta',
			label: 'Okta',
			subLabel: 'Provisioning Client',
			emoji: '\u{1F511}',
			activeGradient: 'bg-gradient-to-br from-actor-okta-600 to-actor-okta-700',
			activeShadow: 'shadow-lg shadow-actor-okta/30',
			activeRing: 'ring-2 ring-actor-okta/50',
		},
		{
			key: 'ots',
			label: 'OTS',
			subLabel: 'SCIM Server',
			emoji: '\u{1F510}',
			activeGradient: 'bg-gradient-to-br from-actor-ots-600 to-actor-ots-700',
			activeShadow: 'shadow-lg shadow-actor-ots/30',
			activeRing: 'ring-2 ring-actor-ots/50',
		},
	],
	connections: [
		{
			from: 'okta',
			to: 'ots',
			protocol: 'SCIM 2.0',
			subProtocol: 'REST + JSON',
			activeColor: 'bg-actor-okta',
			activeBorderLeft: 'border-l-actor-okta',
			activeBorderRight: 'border-r-actor-okta',
		},
	],
};

/**
 * Full demo configuration.
 */
export const demoConfig: DemoConfig = {
	title: 'SCIM Provisioning with Okta',
	subtitle: "Okta pushes user lifecycle changes (create, update, deactivate) to the app's SCIM API",
	version: '0.1.0',
	backLink: {
		href: DEMOS_INDEX_PATH,
		label: 'All demos',
	},
	actorConfig,
	protocolStack,
};
