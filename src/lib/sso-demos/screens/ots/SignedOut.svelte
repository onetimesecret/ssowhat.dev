<script lang="ts">
  /**
   * OTS signed-out screen - shown after the local session is destroyed
   * and (optionally) after the SAML SLO round-trip completes.
   */
</script>

<div class="flex h-full items-center justify-center bg-surface">
  <div class="w-full max-w-sm rounded-lg border border-edge-emphasis bg-surface-raised p-8 text-center">
    <div class="mb-4 text-3xl" aria-hidden="true">&#x1F510;</div>
    <h2 class="text-lg font-semibold text-ink">You've been signed out</h2>
    <p class="mt-2 text-sm text-ink-tertiary">Your Onetime Secret session has ended.</p>
    <button
      type="button"
      class="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-500"
    >
      Sign back in
    </button>
  </div>
</div>
