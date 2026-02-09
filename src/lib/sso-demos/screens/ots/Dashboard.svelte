<script lang="ts">
  /**
   * OTS Dashboard screen - the authenticated state of the application.
   * This is the "constant" across all SSO demos - the SaaS app being protected.
   * Includes interactive elements to show the app is functional post-authentication.
   */

  interface Secret {
    id: string;
    preview: string;
    created: string;
  }

  let secretText = $state('');
  let recentSecrets = $state<Secret[]>([]);

  let isDisabled = $derived(!secretText.trim());

  function handleCreateSecret() {
    const fakeId = Math.random().toString(36).substring(2, 10);
    recentSecrets = [
      {
        id: fakeId,
        preview: secretText.length > 24 ? secretText.substring(0, 24) + '...' : secretText,
        created: 'Just now',
      },
      ...recentSecrets.slice(0, 2).map((s) => ({ ...s, created: 'Earlier' })),
    ];
    secretText = '';
  }
</script>

<div class="h-full bg-surface">
  <nav class="flex items-center justify-between bg-surface-raised px-4 py-3 text-white">
    <div class="flex items-center gap-4">
      <span class="text-lg font-bold">&#x1F510; OTS</span>
      <span class="text-sm text-ink-tertiary">Dashboard</span>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-sm text-ink-secondary">alice@contoso.com</span>
      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 font-medium">
        A
      </div>
    </div>
  </nav>
  <div class="p-6">
    <div class="mb-4 rounded-lg border border-edge-emphasis bg-surface-raised p-6">
      <h2 id="create-secret-heading" class="mb-4 text-lg font-semibold text-ink">
        Create a Secret
      </h2>
      <label for="secret-text" class="sr-only">Secret content</label>
      <textarea
        id="secret-text"
        aria-describedby="create-secret-heading"
        class="h-20 w-full resize-none rounded-lg border border-edge bg-code-surface p-3 text-ink placeholder-ink-tertiary focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        placeholder="Enter your secret..."
        bind:value={secretText}
      ></textarea>
      <button
        onclick={handleCreateSecret}
        disabled={isDisabled}
        class="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-500 active:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-edge-emphasis disabled:text-ink-tertiary"
      >
        Create Secret Link
      </button>
    </div>
    <div class="rounded-lg border border-edge-emphasis bg-surface-raised p-6">
      <h2 class="mb-4 text-lg font-semibold text-ink">
        Recent Secrets
      </h2>
      {#if recentSecrets.length > 0}
        <div class="space-y-2">
          {#each recentSecrets as secret (secret.id)}
            <div class="flex items-center justify-between rounded-lg border border-edge bg-code-surface p-3 text-sm">
              <div class="flex items-center gap-3">
                <span class="rounded bg-surface-raised px-2 py-0.5 font-mono text-xs text-ink-secondary">
                  {secret.id}
                </span>
                <span class="text-ink-secondary">{secret.preview}</span>
              </div>
              <span class="text-xs text-ink-muted">
                {secret.created}
              </span>
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-sm text-ink-muted">No secrets created yet</div>
      {/if}
    </div>
  </div>
</div>
