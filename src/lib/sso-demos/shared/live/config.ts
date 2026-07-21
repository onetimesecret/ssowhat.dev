// src/lib/sso-demos/shared/live/config.ts

import type { LiveDemoConfig } from '../../types.js';

/**
 * localStorage key that overrides the mock-server origin at runtime, so a
 * deployed static build can be pointed at an alternate backend without a
 * rebuild.
 */
export const MOCK_SERVER_URL_KEY = 'ssowhat:mock-server-url';

/** Default mock-server origin when nothing overrides it. */
export const DEFAULT_MOCK_SERVER_URL = 'http://localhost:8787';

/**
 * The demo bearer token, byte-identical to the Authorization line in the
 * static traces. The `...redacted` characters are part of the literal token --
 * it is not an elision. This token is public teaching material from the static
 * demo; it gates nothing of value.
 */
export const DEMO_TOKEN = 'ots_scim_tk_9f3a...redacted';

// localStorage is client-only and the accessor itself can throw SecurityError
// when storage is blocked (e.g. Chrome's "Block all cookies", some webviews),
// so access goes through this guard instead of touching localStorage directly.
// This replicates the SSR-safe readPref pattern from SSODemoShell without
// depending on $app/environment, keeping this module importable from plain
// node (vitest) contexts.
function readPref(key: string): string | null {
	try {
		if (typeof localStorage === 'undefined') return null;
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

/**
 * Resolves the mock-server origin for live transport, in precedence order:
 * the `ssowhat:mock-server-url` localStorage key, then `config.baseUrl`, then
 * the build-time `VITE_MOCK_SERVER_URL` value, then the localhost default.
 * Trailing slashes are stripped so exchange paths can be appended verbatim.
 */
export function resolveBaseUrl(config?: LiveDemoConfig): string {
	const fromPref = readPref(MOCK_SERVER_URL_KEY);
	if (fromPref) return stripTrailingSlashes(fromPref);
	if (config?.baseUrl) return stripTrailingSlashes(config.baseUrl);
	const env = import.meta.env as Record<string, string | undefined> | undefined;
	const fromEnv = env?.VITE_MOCK_SERVER_URL;
	if (fromEnv) return stripTrailingSlashes(fromEnv);
	return DEFAULT_MOCK_SERVER_URL;
}

function stripTrailingSlashes(url: string): string {
	return url.replace(/\/+$/, '');
}
