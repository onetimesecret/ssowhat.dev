// src/lib/sso-demos/oauth2-google/config.ts

import type { DemoConfig, ActorConfig, ProtocolStackConfig } from '$lib/sso-demos';
import { DEMOS_INDEX_PATH } from '$lib/sso-demos';

/**
 * Actor configuration for the OAuth2/OIDC Google demo.
 * Direct OAuth2 integration: OTS communicates with Google via OAuth 2.0 + OIDC.
 *
 * Colors use semantic classes from sso-demo-theme.css (bg-actor-*).
 * To customize actor colors, modify the theme file.
 */
export const actorConfig: ActorConfig[] = [
	{ key: 'browser', label: 'Browser', activeColor: 'bg-actor-browser' },
	{ key: 'ots', label: 'OTS', activeColor: 'bg-actor-ots' },
	{ key: 'google', label: 'Google', activeColor: 'bg-actor-google' },
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
			subLabel: 'Application',
			emoji: '\u{1F510}',
			activeGradient: 'bg-gradient-to-br from-actor-ots-600 to-actor-ots-700',
			activeShadow: 'shadow-lg shadow-actor-ots/30',
			activeRing: 'ring-2 ring-actor-ots/50',
		},
		{
			key: 'google',
			label: 'Google',
			subLabel: 'OAuth2 / OIDC Provider',
			emoji: '\u{1F310}',
			activeGradient: 'bg-gradient-to-br from-actor-google-600 to-actor-google-700',
			activeShadow: 'shadow-lg shadow-actor-google/30',
			activeRing: 'ring-2 ring-actor-google/50',
		},
	],
	connections: [
		{
			from: 'ots',
			to: 'google',
			protocol: 'OAuth2',
			subProtocol: '(+ OIDC)',
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
	title: 'OAuth2 Social Login with Google',
	subtitle: 'OTS authenticates with Google via OAuth 2.0 and OpenID Connect',
	version: '0.1.0',
	backLink: {
		href: DEMOS_INDEX_PATH,
		label: 'All demos',
	},
	actorConfig,
	protocolStack,
};
