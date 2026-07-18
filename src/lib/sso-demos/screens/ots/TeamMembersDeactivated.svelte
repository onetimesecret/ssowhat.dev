<script lang="ts">
	/**
	 * Deactivated-state wrapper for TeamMembers.
	 * SSODemoShell instantiates screens without props, so each depicted state
	 * needs its own screens-map entry; this wrapper pins deactivated=true.
	 */
	import TeamMembers from './TeamMembers.svelte';
</script>

<TeamMembers deactivated />
