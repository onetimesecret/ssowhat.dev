<script lang="ts">
	import '$lib/sso-demos/shared/sso-demo-theme.css';
	import IdPSAMLOkta from '$lib/sso-demos/idp-saml-okta/IdPSAMLOkta.svelte';

	const pageTitle = 'IdP-Initiated SAML with Okta';
	const pageDescription =
		'Interactive visualization of IdP-initiated SAML 2.0: the user launches the app from the Okta dashboard tile and Okta pushes an unsolicited signed assertion with no InResponseTo to validate';
</script>

<svelte:head>
	<title>{pageTitle} | ssowhat.dev</title>
	<meta name="description" content={pageDescription} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://ssowhat.dev/idp-saml-okta/" />
	<meta property="og:site_name" content="ssowhat.dev" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "TechArticle",
		"name": pageTitle,
		"description": pageDescription,
		"url": "https://ssowhat.dev/idp-saml-okta/",
		"author": { "@type": "Organization", "name": "Onetime Secret", "url": "https://onetimesecret.com" },
		"about": [
			{ "@type": "Thing", "name": "SAML 2.0" },
			{ "@type": "Thing", "name": "IdP-Initiated SSO" },
			{ "@type": "Thing", "name": "Okta" },
			{ "@type": "Thing", "name": "Enterprise SSO" }
		]
	})}</script>`}
</svelte:head>

<IdPSAMLOkta />
