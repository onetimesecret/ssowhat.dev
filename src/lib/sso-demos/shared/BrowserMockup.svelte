<script lang="ts">
	import type { Snippet } from 'svelte';

	interface BrowserMockupProps {
		/** URL to display in the address bar */
		urlBar: string;
		/** Screen content to render inside the browser */
		children: Snippet;
		/** Progress percentage (0-100) for loading indicator. Only shown when > 0. */
		loadingProgress?: number;
		/** Duration in ms for the progress animation */
		loadingDuration?: number;
	}

	let {
		urlBar,
		children,
		loadingProgress = 0,
		loadingDuration = 3500,
	}: BrowserMockupProps = $props();

	let showProgress = $derived(loadingProgress > 0);
</script>

<!--
	Browser chrome wrapper component.
	Provides the macOS-style browser window frame with traffic lights and URL bar.
-->
<div class="flex flex-1 flex-col overflow-hidden rounded-lg border border-edge shadow-2xl">
	<!-- Browser chrome -->
	<div
		class="flex flex-shrink-0 items-center gap-2 bg-gradient-to-b from-gray-300 to-gray-400 px-3 py-2"
	>
		<!-- Traffic lights -->
		<div class="flex gap-1.5" aria-hidden="true">
			<div class="h-3 w-3 rounded-full bg-red-500"></div>
			<div class="h-3 w-3 rounded-full bg-yellow-500"></div>
			<div class="h-3 w-3 rounded-full bg-green-500"></div>
		</div>
		<!-- URL bar -->
		<div class="mx-4 flex-1">
			<div class="truncate rounded bg-white px-3 py-1 font-mono text-xs text-gray-700">
				{urlBar}
			</div>
		</div>
	</div>

	<!-- Loading progress bar - like browser page load indicator -->
	<div
		class="h-1 w-full bg-surface-raised"
		role="progressbar"
		aria-valuenow={loadingProgress}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label="Step progress"
	>
		<div
			class="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 shadow-sm shadow-blue-500/50 motion-reduce:transition-none"
			style:width="{loadingProgress}%"
			style:transition={showProgress ? `width ${loadingDuration}ms linear` : 'none'}
		></div>
	</div>

	<!-- Demo warning banner - clarifies this is not a real login -->
	<div
		class="flex items-center justify-center gap-1.5 bg-amber-900/40 px-3 py-1 text-xs text-amber-200"
		role="note"
		aria-label="This is a demo simulation. Do not enter real credentials."
	>
		<svg
			class="h-3.5 w-3.5 flex-shrink-0"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
		<span>Demo simulation — do not enter real credentials</span>
	</div>

	<!-- Screen content -->
	<div class="flex-1 overflow-hidden">
		{@render children()}
	</div>
</div>
