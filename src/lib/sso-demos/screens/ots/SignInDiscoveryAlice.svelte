<script lang="ts">
	/**
	 * Home-realm discovery sign-in with Alice's email entered.
	 * contoso.com resolves to Entra ID (OIDC).
	 */
	import SignInDiscovery from './SignInDiscovery.svelte';
</script>

<SignInDiscovery email="alice@contoso.com" />
