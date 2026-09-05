<script lang="ts">
	import '$lib/sso-demos/shared/sso-demo-theme.css';
	import SLOSAMLOkta from '$lib/sso-demos/slo-saml-okta/SLOSAMLOkta.svelte';

	const pageTitle = 'SAML Single Logout with Okta';
	const pageDescription =
		'Interactive visualization of SAML 2.0 Single Logout: the service provider sends a LogoutRequest to Okta, Okta front-channels it to the other apps, one of them cannot map the NameID to a local session, and the LogoutResponse comes back PartialLogout';
</script>

<svelte:head>
	<title>{pageTitle} | ssowhat.dev</title>
	<meta name="description" content={pageDescription} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://ssowhat.dev/slo-saml-okta/" />
	<meta property="og:site_name" content="ssowhat.dev" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "TechArticle",
		"name": pageTitle,
		"description": pageDescription,
		"url": "https://ssowhat.dev/slo-saml-okta/",
		"author": { "@type": "Organization", "name": "Onetime Secret", "url": "https://onetimesecret.com" },
		"about": [
			{ "@type": "Thing", "name": "SAML 2.0" },
			{ "@type": "Thing", "name": "Single Logout" },
			{ "@type": "Thing", "name": "Okta" },
			{ "@type": "Thing", "name": "Enterprise SSO" }
		]
	})}</script>`}
</svelte:head>

<SLOSAMLOkta />
