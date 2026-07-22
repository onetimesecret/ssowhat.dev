// packages/mock-server/vitest.config.ts

import { defineConfig } from 'vitest/config';

// Package-local config so vitest does not walk up to the repo root and load
// the SvelteKit vite.config.ts. Node environment, in-process app tests only.
export default defineConfig({
	test: {
		environment: 'node',
		include: ['test/**/*.test.ts'],
	},
});
