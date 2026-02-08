<script lang="ts">
	import '$lib/sso-demos/shared/sso-demo-theme.css';
	import OIDCSAMLBridge from '$lib/sso-demos/oidc-saml-bridge/OIDCSAMLBridge.svelte';

	const pageTitle = 'OIDC\u2192SAML Bridge via Forward Auth';
	const pageDescription =
		'Interactive visualization of OIDC\u2192SAML protocol bridging with forward auth: Caddy + oauth2-proxy + Logto + Entra ID';
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
</svelte:head>

<OIDCSAMLBridge />
