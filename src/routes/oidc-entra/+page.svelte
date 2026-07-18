<script lang="ts">
	import '$lib/sso-demos/shared/sso-demo-theme.css';
	import OIDCEntra from '$lib/sso-demos/oidc-entra/OIDCEntra.svelte';

	const pageTitle = 'Enterprise OIDC with Entra ID';
	const pageDescription =
		'Interactive visualization of OpenID Connect with Microsoft Entra ID: tenant-scoped endpoints, admin consent, Conditional Access, code exchange, and tid/oid identity mapping';
</script>

<svelte:head>
	<title>{pageTitle} | ssowhat.dev</title>
	<meta name="description" content={pageDescription} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://ssowhat.dev/oidc-entra/" />
	<meta property="og:site_name" content="ssowhat.dev" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "TechArticle",
		"name": pageTitle,
		"description": pageDescription,
		"url": "https://ssowhat.dev/oidc-entra/",
		"author": { "@type": "Organization", "name": "Onetime Secret", "url": "https://onetimesecret.com" },
		"about": [
			{ "@type": "Thing", "name": "OpenID Connect" },
			{ "@type": "Thing", "name": "OAuth 2.0" },
			{ "@type": "Thing", "name": "Microsoft Entra ID" },
			{ "@type": "Thing", "name": "PKCE" }
		]
	})}</script>`}
</svelte:head>

<OIDCEntra />
