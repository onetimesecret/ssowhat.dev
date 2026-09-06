// src/lib/sso-demos/idp-saml-okta/config.ts

import type { DemoConfig, ActorConfig, ProtocolStackConfig } from '$lib/sso-demos';
import { DEMOS_INDEX_PATH, DEMO_VERSION } from '$lib/sso-demos';

/**
 * Actor configuration for the IdP-initiated SAML demo.
 * Same actors as SP-initiated, but the flow starts at Okta (IdP):
 * the user launches OTS from the Okta dashboard tile.
 *
 * Colors use semantic classes from sso-demo-theme.css (bg-actor-*).
 * To customize actor colors, modify the theme file.
 */
export const actorConfig: ActorConfig[] = [
	{ key: 'browser', label: 'Browser', activeColor: 'bg-actor-browser' },
	{ key: 'okta', label: 'Okta', activeColor: 'bg-actor-okta' },
	{ key: 'ots', label: 'OTS', activeColor: 'bg-actor-ots' },
];

/**
 * Protocol stack configuration showing the architecture.
 * Okta appears first: the IdP is the entry point in this flow.
 */
export const protocolStack: ProtocolStackConfig = {
	components: [
		{
			key: 'okta',
			label: 'Okta',
			subLabel: 'Identity Provider',
			emoji: '\u{1F511}',
			activeGradient: 'bg-gradient-to-br from-actor-okta-600 to-actor-okta-700',
			activeShadow: 'shadow-lg shadow-actor-okta/30',
			activeRing: 'ring-2 ring-actor-okta/50',
		},
		{
			key: 'ots',
			label: 'OTS',
			subLabel: 'Service Provider',
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
			protocol: 'SAML',
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
	title: 'IdP-Initiated SAML with Okta',
	subtitle: 'User launches OTS from the Okta dashboard; Okta pushes an unsolicited SAML assertion',
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
