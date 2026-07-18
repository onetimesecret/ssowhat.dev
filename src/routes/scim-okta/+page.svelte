<script lang="ts">
	import '$lib/sso-demos/shared/sso-demo-theme.css';
	import SCIMOkta from '$lib/sso-demos/scim-okta/SCIMOkta.svelte';

	const pageTitle = 'SCIM Provisioning with Okta';
	const pageDescription =
		'Interactive visualization of SCIM 2.0 user provisioning: Okta creates, updates, and deactivates accounts in the application via server-to-server REST calls -- the full identity lifecycle, with no end-user browser in the protocol';
</script>

<svelte:head>
	<title>{pageTitle} | ssowhat.dev</title>
	<meta name="description" content={pageDescription} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://ssowhat.dev/scim-okta/" />
	<meta property="og:site_name" content="ssowhat.dev" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "TechArticle",
		"name": pageTitle,
		"description": pageDescription,
		"url": "https://ssowhat.dev/scim-okta/",
		"author": { "@type": "Organization", "name": "Onetime Secret", "url": "https://onetimesecret.com" },
		"about": [
			{ "@type": "Thing", "name": "SCIM 2.0" },
			{ "@type": "Thing", "name": "User Provisioning" },
			{ "@type": "Thing", "name": "Okta" },
			{ "@type": "Thing", "name": "Identity Lifecycle" }
		]
	})}</script>`}
</svelte:head>

<SCIMOkta />
