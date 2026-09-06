// src/lib/sso-demos/oidc-entra/config.ts

import type { DemoConfig, ActorConfig, ProtocolStackConfig } from '$lib/sso-demos';
import { DEMOS_INDEX_PATH, DEMO_VERSION } from '$lib/sso-demos';

/**
 * Actor configuration for the direct Entra ID OIDC demo.
 * Direct enterprise OIDC integration: The app communicates with Microsoft
 * Entra ID via OAuth 2.0 + OIDC against a workforce tenant.
 *
 * Colors use semantic classes from sso-demo-theme.css (bg-actor-*).
 * To customize actor colors, modify the theme file.
 */
export const actorConfig: ActorConfig[] = [
	{ key: 'browser', label: 'Browser', activeColor: 'bg-actor-browser' },
	{ key: 'ots', label: 'App', activeColor: 'bg-actor-ots' },
	{ key: 'entra', label: 'Entra', activeColor: 'bg-actor-entra' },
];

/**
 * Protocol stack configuration showing the architecture.
 * Colors use semantic classes from sso-demo-theme.css.
 */
export const protocolStack: ProtocolStackConfig = {
	components: [
		{
			key: 'ots',
			label: 'App',
			subLabel: 'Application',
			emoji: '\u{1F510}',
			activeGradient: 'bg-gradient-to-br from-actor-ots-600 to-actor-ots-700',
			activeShadow: 'shadow-lg shadow-actor-ots/30',
			activeRing: 'ring-2 ring-actor-ots/50',
		},
		{
			key: 'entra',
			label: 'Entra',
			subLabel: 'OIDC Provider',
			emoji: '\u{1F3E2}',
			activeGradient: 'bg-gradient-to-br from-actor-entra-600 to-actor-entra-700',
			activeShadow: 'shadow-lg shadow-actor-entra/30',
			activeRing: 'ring-2 ring-actor-entra/50',
		},
	],
	connections: [
		{
			from: 'ots',
			to: 'entra',
			protocol: 'OIDC',
			subProtocol: '(Auth Code + PKCE)',
			activeColor: 'bg-actor-ots',
			activeBorderLeft: 'border-l-actor-ots',
			activeBorderRight: 'border-r-actor-ots',
		},
	],
};

/**
 * Full demo configuration.
 */
export const demoConfig: DemoConfig = {
	title: 'Enterprise OIDC with Entra ID',
	subtitle: 'The app authenticates directly with Microsoft Entra ID via OpenID Connect',
	version: DEMO_VERSION,
	fidelity: {
		level: 'reconstructed',
		reviewed: '2026-09-05',
	},
	backLink: {
		href: DEMOS_INDEX_PATH,
		label: 'All demos',
	},
	actorConfig,
	protocolStack,
};
