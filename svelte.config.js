import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html',
			precompress: false,
			strict: true
		}),
		prerender: {
			handleHttpError: ({ path }) => {
				// Static assets aren't available during prerender crawl
				if (path === '/favicon.svg') return;
				throw new Error(`404 ${path}`);
			}
		}
	}
};

export default config;
