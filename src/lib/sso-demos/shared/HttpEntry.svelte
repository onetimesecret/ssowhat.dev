<script lang="ts">
  import type { HttpMessage } from './types.js';

  /**
   * Renders a single HTTP message in the authentication flow.
   * Supports requests, responses, internal processes, and server-to-server communication.
   * Includes expandable payload sections for decoded SAML/JWT content.
   */

  const TYPE_STYLES: Record<HttpMessage['type'], string> = {
    request: 'border-l-4 border-http-request bg-http-request-dim',
    response: 'border-l-4 border-http-response bg-http-response-dim',
    internal: 'border-l-4 border-http-internal bg-gray-800',
    server: 'border-l-4 border-http-server bg-http-server-dim',
    'server-response': 'border-l-4 border-http-server bg-http-server-dim',
  };

  const TYPE_LABELS: Record<HttpMessage['type'], string> = {
    request: 'REQUEST',
    response: 'RESPONSE',
    internal: 'INTERNAL',
    server: 'SERVER\u2192SERVER',
    'server-response': 'SERVER RESPONSE',
  };

  interface Props {
    /** The HTTP message to display */
    entry: HttpMessage;
  }

  let { entry }: Props = $props();

  let expanded = $state(false);

  // Generate a unique ID for aria-controls (stable per component instance)
  const uniqueId = crypto.randomUUID().slice(0, 8);
</script>

<div class="{TYPE_STYLES[entry.type]} rounded p-3 text-sm">
  <div class="flex items-start justify-between gap-2">
    <div class="min-w-0 flex-1">
      <div class="mb-1 flex items-center gap-2 text-xs text-gray-400">
        <!-- Type icon -->
        {#if entry.type === 'request'}
          <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        {:else if entry.type === 'response'}
          <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
        {:else if entry.type === 'internal'}
          <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        {:else if entry.type === 'server'}
          <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        {:else if entry.type === 'server-response'}
          <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 17l-4 4m0 0l-4-4m4 4V3" />
          </svg>
        {/if}

        <span class="font-mono font-semibold">{TYPE_LABELS[entry.type]}</span>

        {#if entry.from && entry.to}
          <span>
            {entry.from} &rarr; {entry.to}
          </span>
        {/if}
      </div>

      {#if entry.label}
        <div class="mb-1 font-medium text-yellow-400">
          {entry.label}
        </div>
      {/if}

      {#if entry.method}
        <div class="font-mono">
          <span class="text-emerald-400">{entry.method}</span>{' '}
          <span class="break-all text-blue-300">{entry.url}</span>
        </div>
      {/if}

      {#if entry.status}
        <div class="font-mono text-emerald-400">{entry.status}</div>
      {/if}

      {#if entry.headers && entry.headers.length > 0}
        <div class="mt-2 font-mono text-xs text-gray-400">
          {#each entry.headers as header}
            <div>{header}</div>
          {/each}
        </div>
      {/if}

      {#if entry.body}
        <pre class="mt-2 overflow-x-auto rounded bg-black/30 p-2 font-mono text-xs whitespace-pre-wrap text-gray-300">{entry.body}</pre>
      {/if}

      {#if entry.note}
        <div class="mt-2 text-xs text-yellow-500/80 italic">
          &#x1F4A1; {entry.note}
        </div>
      {/if}
    </div>

    {#if entry.expandedPayload}
      <button
        onclick={() => expanded = !expanded}
        aria-expanded={expanded}
        aria-controls="payload-{uniqueId}"
        class="flex-shrink-0 rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600"
      >
        {expanded ? 'Hide decoded' : 'Show decoded'}
      </button>
    {/if}
  </div>

  {#if expanded && entry.expandedPayload}
    <div id="payload-{uniqueId}" class="mt-3 border-t border-gray-700 pt-3">
      <div class="mb-1 text-xs text-gray-400">
        {entry.expandedPayload.label}
      </div>
      <pre class="overflow-x-auto rounded bg-black/40 p-3 font-mono text-xs whitespace-pre-wrap text-green-300">{entry.expandedPayload.content}</pre>
    </div>
  {/if}
</div>
