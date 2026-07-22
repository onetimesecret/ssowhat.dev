// packages/mock-server/src/scim/service-provider-config.ts

import { FILTER_MAX_RESULTS, SERVICE_PROVIDER_CONFIG_SCHEMA } from '../config.js';

/**
 * Static ServiceProviderConfig (RFC 7643 §5). `etag.supported` is false on
 * purpose: the server emits `meta.version` but never an ETag header and
 * never honors If-Match -- declaring true would be a lie. `filter` matches
 * the one whitelisted form; everything else is unsupported.
 */
export function serviceProviderConfig(): Record<string, unknown> {
	return {
		schemas: [SERVICE_PROVIDER_CONFIG_SCHEMA],
		documentationUri: 'https://ssowhat.dev/demos/scim-okta',
		patch: { supported: true },
		bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
		filter: { supported: true, maxResults: FILTER_MAX_RESULTS },
		changePassword: { supported: false },
		sort: { supported: false },
		etag: { supported: false },
		authenticationSchemes: [
			{
				type: 'oauthbearertoken',
				name: 'Demo Bearer token',
				description:
					'Static public demo token from the ssowhat.dev SCIM story; it gates nothing of value.',
			},
		],
	};
}
