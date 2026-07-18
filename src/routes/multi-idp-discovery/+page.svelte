<script lang="ts">
	import '$lib/sso-demos/shared/sso-demo-theme.css';
	import MultiIdPDiscovery from '$lib/sso-demos/multi-idp-discovery/MultiIdPDiscovery.svelte';

	const pageTitle = 'Multi-IdP Home-Realm Discovery';
	const pageDescription =
		'Interactive visualization of identifier-first login across multiple identity providers: email domain lookup, per-realm routing to Entra ID (OIDC) and Okta (SAML), and the realm-binding checks that keep tenants apart';
</script>

<svelte:head>
	<title>{pageTitle} | ssowhat.dev</title>
	<meta name="description" content={pageDescription} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://ssowhat.dev/multi-idp-discovery/" />
	<meta property="og:site_name" content="ssowhat.dev" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "TechArticle",
		"name": pageTitle,
		"description": pageDescription,
		"url": "https://ssowhat.dev/multi-idp-discovery/",
		"author": { "@type": "Organization", "name": "Onetime Secret", "url": "https://onetimesecret.com" },
		"about": [
			{ "@type": "Thing", "name": "Home Realm Discovery" },
			{ "@type": "Thing", "name": "Identity Federation" },
			{ "@type": "Thing", "name": "OpenID Connect" },
			{ "@type": "Thing", "name": "SAML 2.0" }
		]
	})}</script>`}
</svelte:head>

<MultiIdPDiscovery />
