<script lang="ts">
	const pageTitle = 'SSO Authentication Flow Demos';

	const demos = [
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
	<title>{pageTitle}</title>
	<meta
		name="description"
		content="Interactive visualizations of enterprise SSO authentication patterns, protocol bridging, and identity federation"
	/>
</svelte:head>

<div class="flex min-h-screen flex-col px-6 py-12 sm:px-8">
	<div class="mx-auto w-full max-w-3xl flex-1">
		<!-- Header -->
		<header class="mb-14">
			<h1 class="text-3xl font-semibold tracking-tight text-ink">
				{pageTitle}
			</h1>
			<p class="mt-3 text-base text-ink-secondary">
				Interactive visualizations of enterprise SSO authentication patterns.
			</p>
			<p class="mt-4 max-w-2xl text-sm leading-relaxed text-ink-tertiary">
				Each demo walks through a complete authentication flow step by step, showing what the user sees alongside the
				HTTP exchanges happening behind the scenes. Built for engineers evaluating SSO integration patterns.
			</p>
			<p class="mt-5 rounded-lg border border-edge bg-surface px-4 py-3 text-sm leading-relaxed text-ink-tertiary">
				The example application is <a href="https://onetimesecret.com" class="text-accent hover:underline"
					>Onetime Secret</a
				>
				(OTS) &mdash; an open-source tool for sharing sensitive information via self-destructing links. It serves as a realistic
				stand-in for any web application adding SSO support.
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
						<h2 class="text-lg font-semibold text-ink transition-colors group-hover:text-accent">
							{demo.title}
						</h2>
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
				Planned demos include SP-initiated SAML login, SCIM provisioning flows, and multi-IdP federation patterns.
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
