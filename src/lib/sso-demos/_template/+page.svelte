<script lang="ts">
  // src/lib/sso-demos/_template/+page.svelte
  //
  // Template: Copy this file to create the SvelteKit route page for your demo.
  // Target location: src/routes/your-demo/+page.svelte
  //
  // After copying, update:
  // 1. The import path to point to your demo's Demo.svelte
  // 2. The page title and description

  import Demo from '$lib/sso-demos/_template/Demo.svelte';
  // Demo-scoped theme with semantic color variables for HTTP messages and actors
  import '$lib/sso-demos/sso-demo-theme.css';
</script>

<svelte:head>
  <title>Your Demo Title</title>
  <meta name="description" content="Brief description of your SSO authentication demo" />
</svelte:head>

<Demo />
