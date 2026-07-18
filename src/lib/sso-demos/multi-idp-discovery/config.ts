// src/lib/sso-demos/multi-idp-discovery/config.ts

import type { DemoConfig, ActorConfig, ProtocolStackConfig } from '$lib/sso-demos';
import { DEMOS_INDEX_PATH } from '$lib/sso-demos';

/**
 * Actor configuration for the multi-IdP home-realm discovery demo.
 * OTS serves multiple customer organizations, each with its own IdP:
 * Contoso authenticates via Entra ID (OIDC), Acme via Okta (SAML 2.0).
 *
 * Colors use semantic classes from sso-demo-theme.css (bg-actor-*).
 * To customize actor colors, modify the theme file.
 */
export const actorConfig: ActorConfig[] = [
	{ key: 'browser', label: 'Browser', activeColor: 'bg-actor-browser' },
	{ key: 'ots', label: 'OTS', activeColor: 'bg-actor-ots' },
	{ key: 'entra', label: 'Entra', activeColor: 'bg-actor-entra' },
	{ key: 'okta', label: 'Okta', activeColor: 'bg-actor-okta' },
];

/**
 * Protocol stack configuration showing the architecture.
 * OTS sits in the middle as the hub, with one connection per realm:
 * OIDC to Contoso's Entra tenant, SAML to Acme's Okta org.
 */
export const protocolStack: ProtocolStackConfig = {
	components: [
		{
			key: 'entra',
			label: 'Entra',
			subLabel: "Contoso's IdP",
			emoji: '\u{1F3E2}',
			activeGradient: 'bg-gradient-to-br from-actor-entra-600 to-actor-entra-700',
			activeShadow: 'shadow-lg shadow-actor-entra/30',
			activeRing: 'ring-2 ring-actor-entra/50',
		},
		{
			key: 'ots',
			label: 'OTS',
			subLabel: 'Application',
			emoji: '\u{1F510}',
			activeGradient: 'bg-gradient-to-br from-actor-ots-600 to-actor-ots-700',
			activeShadow: 'shadow-lg shadow-actor-ots/30',
			activeRing: 'ring-2 ring-actor-ots/50',
		},
		{
			key: 'okta',
			label: 'Okta',
			subLabel: "Acme's IdP",
			emoji: '\u{1F511}',
			activeGradient: 'bg-gradient-to-br from-actor-okta-600 to-actor-okta-700',
			activeShadow: 'shadow-lg shadow-actor-okta/30',
			activeRing: 'ring-2 ring-actor-okta/50',
		},
	],
	connections: [
		{
			from: 'entra',
			to: 'ots',
			protocol: 'OIDC',
			subProtocol: '(contoso.com)',
			activeColor: 'bg-actor-entra',
			activeBorderLeft: 'border-l-actor-entra',
			activeBorderRight: 'border-r-actor-entra',
		},
		{
			from: 'ots',
			to: 'okta',
			protocol: 'SAML',
			subProtocol: '(acme.com)',
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
	title: 'Multi-IdP Home-Realm Discovery',
	subtitle: 'One email-first sign-in page routes each organization to its own IdP',
	version: '0.1.0',
	backLink: {
		href: DEMOS_INDEX_PATH,
		label: 'All demos',
	},
	actorConfig,
	protocolStack,
};
