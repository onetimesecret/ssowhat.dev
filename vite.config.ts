// vite.config.ts

// Usage:
//
// VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=.example.com pnpm run dev
//
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, '.', 'VITE_');
	const additionalHosts =
		env.VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS?.split(',')
			.map((h: string) => h.trim())
			.filter(Boolean) ?? [];

	return {
		plugins: [tailwindcss(), sveltekit()],
		server: {
			allowedHosts: additionalHosts,
		},
	};
});
