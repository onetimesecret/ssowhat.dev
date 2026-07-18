<script lang="ts">
	/**
	 * Home-realm discovery sign-in with Bob's email entered.
	 * acme.com resolves to Okta (SAML 2.0).
	 */
	import SignInDiscovery from './SignInDiscovery.svelte';
</script>

<SignInDiscovery email="bob@acme.com" />
