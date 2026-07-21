// packages/mock-server/src/scim/filter.ts

/**
 * Whitelist SCIM filter parser -- deliberately not a grammar. It satisfies
 * the static demo's "parse the filter with a real grammar, treat it as
 * untrusted" teaching point by rejecting everything outside the one form
 * Okta requires: `userName eq "value"`. No eval, no interpolation, one
 * anchored regex.
 */
const FILTER_RE = /^(\w+)\s+eq\s+"([^"]*)"$/;

/** Detail string for every 400 invalidFilter response. */
export const FILTER_DETAIL = 'Only the filter form: userName eq "value" is supported';

/**
 * Parses a (framework-decoded) filter expression. Returns the opaque value
 * string when the filter is exactly `userName eq "value"` (attribute name
 * compared case-insensitively, extra whitespace tolerated), or null for
 * anything else -- unsupported attributes and unparseable input alike.
 */
export function parseFilter(raw: string): { value: string } | null {
	const match = FILTER_RE.exec(raw.trim());
	if (!match) return null;
	if (match[1].toLowerCase() !== 'username') return null;
	return { value: match[2] };
}
