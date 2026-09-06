// src/lib/sso-demos/sp-saml-okta/config.ts

import type { DemoConfig, ActorConfig, ProtocolStackConfig } from '$lib/sso-demos';
import { DEMOS_INDEX_PATH, DEMO_VERSION } from '$lib/sso-demos';

/**
 * Actor configuration for the SP-initiated SAML demo.
 * Direct SAML integration: OTS (SP) communicates with Okta (IdP) via SAML 2.0.
 *
 * Colors use semantic classes from sso-demo-theme.css (bg-actor-*).
 * To customize actor colors, modify the theme file.
 */
export const actorConfig: ActorConfig[] = [
	{ key: 'browser', label: 'Browser', activeColor: 'bg-actor-browser' },
	{ key: 'ots', label: 'OTS', activeColor: 'bg-actor-ots' },
	{ key: 'okta', label: 'Okta', activeColor: 'bg-actor-okta' },
];

/**
 * Protocol stack configuration showing the architecture.
 * Colors use semantic classes from sso-demo-theme.css.
 */
export const protocolStack: ProtocolStackConfig = {
	components: [
		{
			key: 'ots',
			label: 'OTS',
			subLabel: 'Service Provider',
			emoji: '\u{1F510}',
			activeGradient: 'bg-gradient-to-br from-actor-ots-600 to-actor-ots-700',
			activeShadow: 'shadow-lg shadow-actor-ots/30',
			activeRing: 'ring-2 ring-actor-ots/50',
		},
		{
			key: 'okta',
			label: 'Okta',
			subLabel: 'Identity Provider',
			emoji: '\u{1F511}',
			activeGradient: 'bg-gradient-to-br from-actor-okta-600 to-actor-okta-700',
			activeShadow: 'shadow-lg shadow-actor-okta/30',
			activeRing: 'ring-2 ring-actor-okta/50',
		},
	],
	connections: [
		{
			from: 'ots',
			to: 'okta',
			protocol: 'SAML',
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
	title: 'SP-Initiated SAML with Okta',
	subtitle: 'OTS authenticates directly with Okta via SAML 2.0',
	version: DEMO_VERSION,
	fidelity: {
		level: 'reconstructed',
		note: 'The Okta login trace uses the Classic Engine Authentication API (/api/v1/authn); Identity Engine hosted login differs.',
		reviewed: '2026-09-05',
	},
	backLink: {
		href: DEMOS_INDEX_PATH,
		label: 'All demos',
	},
	actorConfig,
	protocolStack,
};
