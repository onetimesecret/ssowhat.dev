<script lang="ts">
	import '$lib/sso-demos/shared/sso-demo-theme.css';
	import SPSAMLOkta from '$lib/sso-demos/sp-saml-okta/SPSAMLOkta.svelte';

	const pageTitle = 'SP-Initiated SAML with Okta';
	const pageDescription =
		'Interactive visualization of SP-initiated SAML 2.0 authentication: the service provider redirects to Okta, the user authenticates, and Okta returns a signed SAML assertion';
</script>

<svelte:head>
	<title>{pageTitle} | ssowhat.dev</title>
	<meta name="description" content={pageDescription} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://ssowhat.dev/sp-saml-okta/" />
	<meta property="og:site_name" content="ssowhat.dev" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "TechArticle",
		"name": pageTitle,
		"description": pageDescription,
		"url": "https://ssowhat.dev/sp-saml-okta/",
		"author": { "@type": "Organization", "name": "Onetime Secret", "url": "https://onetimesecret.com" },
		"about": [
			{ "@type": "Thing", "name": "SAML 2.0" },
			{ "@type": "Thing", "name": "SP-Initiated SSO" },
			{ "@type": "Thing", "name": "Okta" },
			{ "@type": "Thing", "name": "Enterprise SSO" }
		]
	})}</script>`}
</svelte:head>

<SPSAMLOkta />
