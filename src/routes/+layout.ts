export const prerender = true;

/**
 * Emit each route as <name>/index.html rather than <name>.html.
 *
 * Every canonical URL on the site (and in the README) is trailing-slash,
 * e.g. https://ssowhat.dev/slo-saml-okta/. GitHub Pages resolves that to
 * <name>/index.html; with the default trailingSlash setting adapter-static
 * writes <name>.html instead, so direct navigation missed and fell through
 * to the 404.html SPA fallback.
 */
export const trailingSlash = 'always';
