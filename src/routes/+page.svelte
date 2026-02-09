<script lang="ts">
	const pageTitle = 'SSO Demos';

	const demos = [
		{
			id: 'oauth2-google',
			title: 'OAuth2 Social Login with Google',
			subtitle: 'OTS authenticates with Google via OAuth 2.0 and OpenID Connect',
			description:
				'The simplest common SSO pattern: "Sign in with Google" using the Authorization Code Flow with PKCE. Walk through the redirect to Google, user consent, server-to-server token exchange, and JWT validation.',
			tags: ['OAuth2', 'OIDC', 'Social Login', 'PKCE'],
			path: '/oauth2-google/',
		},
		{
			id: 'sp-saml-okta',
			title: 'SP-Initiated SAML with Okta',
			subtitle: 'OTS authenticates directly with Okta via SAML 2.0',
			description:
				'Direct SAML integration between application and identity provider. Follow the AuthnRequest, Okta login, signed assertion, and ACS validation in a classic enterprise SSO pattern.',
			tags: ['SAML', 'SP-Initiated', 'Enterprise SSO'],
			path: '/sp-saml-okta/',
		},
		{
			id: 'oidc-saml-bridge',
			title: 'Enterprise SAML for Modern Apps',
			subtitle: 'Caddy + Logto bridge OIDC\u2194SAML to Entra',
			description:
				'The gateway handles enterprise SSO; the application just receives authenticated requests. Step through every redirect, cookie, and token exchange in the complete flow.',
			tags: ['OIDC', 'SAML', 'Forward Auth', 'Protocol Bridging'],
			path: '/oidc-saml-bridge/',
		},
	];
</script>

<svelte:head>
	<title>ssowhat.dev &mdash; {pageTitle}</title>
	<meta
		name="description"
		content="Interactive visualizations of enterprise SSO authentication patterns, protocol bridging, and identity federation"
	/>
	<meta property="og:title" content="ssowhat.dev — SSO Demos" />
	<meta property="og:description" content="Interactive visualizations of enterprise SSO authentication patterns, protocol bridging, and identity federation" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://ssowhat.dev/" />
	<meta property="og:site_name" content="ssowhat.dev" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "WebSite",
		"name": "ssowhat.dev",
		"description": "Interactive visualizations of enterprise SSO authentication patterns, protocol bridging, and identity federation",
		"url": "https://ssowhat.dev/",
		"author": { "@type": "Organization", "name": "Onetime Secret", "url": "https://onetimesecret.com" }
	})}</script>`}
</svelte:head>

<div class="flex min-h-screen flex-col px-6 py-12 sm:px-8">
	<div class="mx-auto w-full max-w-3xl flex-1">
		<!-- Brand -->
		<div class="mb-10 flex flex-col items-center text-center">
			<!-- Mark -->
			<svg
				viewBox="0 0 400 400"
				class="h-24 w-24 drop-shadow-[0_0_20px_rgba(255,255,255,0.05)] sm:h-32 sm:w-32"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				<path d="M200,60 A90,90 0 1,0 200,240 L240,360 L160,360 L200,240 Z" fill="white" />
				<g transform="translate(200, 150) scale(0.75)">
					<path
						d="M-80,0 C-80,-100 80,-100 80,0 C80,40 70,70 50,90 L50,130 C50,160 -50,160 -50,130 L-50,90 C-70,70 -80,40 -80,0"
						fill="black"
					/>
					<path d="M-85,-20 Q0,-30 85,-20 L85,15 Q0,5 -85,15 Z" fill="#222" />
					<path d="M-85,-20 Q0,-30 85,-20 L85,15 Q0,5 -85,15 Z" fill="none" stroke="white" stroke-width="2" />
					<circle cx="-65" cy="-5" r="4" fill="white" />
					<circle cx="-25" cy="-10" r="4" fill="white" />
					<circle cx="25" cy="-10" r="4" fill="white" />
					<circle cx="65" cy="-5" r="4" fill="white" />
					<rect x="-95" y="-15" width="20" height="40" rx="5" fill="black" stroke="white" stroke-width="3" />
					<rect x="75" y="-15" width="20" height="40" rx="5" fill="black" stroke="white" stroke-width="3" />
					<g stroke="white" stroke-width="3" fill="none">
						<path d="M-85,25 L-85,80" stroke-dasharray="8,4" />
						<path d="M85,25 L85,80" stroke-dasharray="8,4" />
					</g>
					<path d="M-12,55 Q0,45 12,55 L0,80 Z" fill="white" />
					<g fill="none" stroke="white" stroke-width="4" stroke-linecap="round">
						<path d="M-35,110 C-35,140 -15,140 -15,115" />
						<path d="M-10,110 C-10,140 10,140 10,115" />
						<path d="M15,110 C15,140 35,140 35,115" />
						<line x1="-45" y1="105" x2="45" y2="105" />
						<line x1="-45" y1="120" x2="45" y2="120" />
					</g>
					<path d="M-55,60 Q-70,80 -55,100" stroke="white" stroke-width="2" fill="none" opacity="0.5" />
					<path d="M55,60 Q70,80 55,100" stroke="white" stroke-width="2" fill="none" opacity="0.5" />
				</g>
			</svg>
			<!-- Wordmark -->
			<h1
				class="mt-4 text-3xl font-black uppercase italic tracking-tighter text-ink [text-shadow:2px_0_#ff0000,-2px_0_#00ff00] sm:text-4xl"
			>
				SSOWHAT.DEV
			</h1>
			<p class="mt-1.5 font-mono text-xs uppercase tracking-widest text-ink-muted sm:text-sm">
				So Far, So Good... SSO WHAT!
			</p>
		</div>

		<!-- Header -->
		<header class="mb-14">
			<h2 class="text-2xl font-semibold tracking-tight text-ink">
				{pageTitle}
			</h2>
			<p class="mt-3 text-base text-ink-secondary">Interactive visualizations.</p>
			<p class="mt-4 max-w-2xl text-sm leading-relaxed text-ink-tertiary">
				Each demo walks through a complete authentication flow step by step, showing what the user sees alongside the
				HTTP exchanges happening behind the scenes. Built for engineers, analysts, and SSO enthusiasts.
			</p>
		</header>

		<!-- Demos -->
		<div class="space-y-4">
			{#each demos as demo}
				<a
					href={demo.path}
					class="group block rounded-lg border border-edge bg-surface p-6 transition-colors hover:border-edge-emphasis hover:bg-surface-raised"
				>
					<div class="flex items-baseline justify-between gap-4">
						<h3 class="text-lg font-semibold text-ink transition-colors group-hover:text-accent">
							{demo.title}
						</h3>
						<span class="shrink-0 text-sm text-ink-muted transition-colors group-hover:text-accent"> View &rarr; </span>
					</div>
					<p class="mt-1 text-sm text-ink-tertiary">
						{demo.subtitle}
					</p>
					<p class="mt-3 text-sm leading-relaxed text-ink-secondary">
						{demo.description}
					</p>
					<div class="mt-4 flex flex-wrap gap-1.5">
						{#each demo.tags as tag}
							<span
								class="rounded border border-edge bg-surface-raised px-2 py-0.5 font-mono text-xs text-ink-tertiary"
							>
								{tag}
							</span>
						{/each}
					</div>
				</a>
			{/each}
		</div>

		<!-- Coming Soon -->
		<div class="mt-8 rounded-lg border border-edge bg-surface px-6 py-5">
			<h3 class="text-xs font-semibold uppercase tracking-wider text-ink-muted">More Coming Soon</h3>
			<p class="mt-2 text-sm text-ink-tertiary">
				Planned demos include SCIM provisioning flows, multi-IdP federation patterns, and IdP-initiated SAML login.
			</p>
		</div>

		<!-- Coming Soon -->
		<div class="mt-8 rounded-lg border border-edge bg-surface px-6 py-5">
			<p class="px-4 py-3 text-sm leading-relaxed text-ink-tertiary">
				The example application is <a href="https://onetimesecret.com" class="text-accent hover:underline"
					>Onetime Secret</a
				>
				(OTS) &mdash; an open-source tool for sharing sensitive information via self-destructing links. It serves as a realistic
				stand-in for any web application adding SSO support.
			</p>
		</div>

		<!-- Footer -->
		<footer class="mt-auto pt-14">
			<div class="border-t border-edge pt-6">
				<p class="text-sm text-ink-muted">Built for technical analysis of SSO integration patterns.</p>
				<p class="mt-2">
					<a
						href="https://onetimesecret.com"
						class="text-sm text-ink-tertiary transition-colors hover:text-ink-secondary"
					>
						&larr; onetimesecret.com
					</a>
				</p>
			</div>
		</footer>
	</div>
</div>
