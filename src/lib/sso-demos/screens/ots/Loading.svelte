<script lang="ts">
  /**
   * Loading/processing screen - shown during redirect flows
   * when the browser is following authentication redirects.
   */
</script>

<div class="flex h-full items-center justify-center bg-slate-900 text-slate-400">
  <div class="flex flex-col items-center gap-2" role="status" aria-live="polite">
    <div class="h-8 w-8 animate-spin motion-reduce:animate-none rounded-full border-4 border-blue-500 border-t-transparent"></div>
    <span>Redirecting...</span>
  </div>
</div>
