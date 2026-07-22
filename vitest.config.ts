// vitest.config.ts

// Root unit-test config, deliberately separate from vite.config.ts: the app
// config instantiates the SvelteKit plugin, which couples it to `svelte-kit
// sync` output that pure-TS unit tests do not need. Colocated `src/**/*.test.ts`
// files are type-checked by svelte-check but never imported by app code, so
// the static build is unaffected.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
		},
	},
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
	},
});
