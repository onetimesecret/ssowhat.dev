<script lang="ts">
	import '$lib/sso-demos/shared/sso-demo-theme.css';
	import OAuth2Google from '$lib/sso-demos/oauth2-google/OAuth2Google.svelte';

	const pageTitle = 'OAuth2 Social Login with Google';
	const pageDescription =
		'Interactive visualization of OAuth2 Authorization Code Flow with Google: sign-in, consent, code exchange, and session creation';
</script>

<svelte:head>
	<title>{pageTitle} | ssowhat.dev</title>
	<meta name="description" content={pageDescription} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://ssowhat.dev/oauth2-google/" />
	<meta property="og:site_name" content="ssowhat.dev" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "TechArticle",
		"name": pageTitle,
		"description": pageDescription,
		"url": "https://ssowhat.dev/oauth2-google/",
		"author": { "@type": "Organization", "name": "Onetime Secret", "url": "https://onetimesecret.com" },
		"about": [
			{ "@type": "Thing", "name": "OAuth 2.0" },
			{ "@type": "Thing", "name": "OpenID Connect" },
			{ "@type": "Thing", "name": "Google Sign-In" },
			{ "@type": "Thing", "name": "PKCE" }
		]
	})}</script>`}
</svelte:head>

<OAuth2Google />
