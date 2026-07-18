<script lang="ts">
	/**
	 * OTS team-members admin page (secrets.example.com/account/team).
	 * Shows the application-side result of SCIM provisioning: Alice's account
	 * exists (or is deactivated) without her ever having signed in.
	 *
	 * The `deactivated` prop switches Alice's row between the two lifecycle
	 * states this screen depicts: provisioned-but-never-logged-in (default)
	 * and deactivated-via-SCIM. SSODemoShell renders screens without props,
	 * so the deactivated state gets its own thin wrapper component
	 * (TeamMembersDeactivated) with its own screens-map key.
	 */

	interface TeamMembersProps {
		/** When true, Alice's row shows the post-offboarding deactivated state */
		deactivated?: boolean;
	}

	let { deactivated = false }: TeamMembersProps = $props();
</script>

<div class="h-full bg-surface">
	<nav class="flex items-center justify-between bg-surface-raised px-4 py-3 text-white">
		<div class="flex items-center gap-4">
			<span class="text-lg font-bold">&#x1F510; OTS</span>
			<span class="text-sm text-ink-tertiary">Team</span>
		</div>
		<div class="flex items-center gap-3">
			<span class="text-sm text-ink-secondary">taylor@contoso.com</span>
			<div class="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 font-medium">
				A
			</div>
		</div>
	</nav>
	<div class="p-6">
		<div class="rounded-lg border border-edge-emphasis bg-surface-raised p-6">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-ink">Team Members</h2>
				<span class="text-xs text-ink-muted">2 members</span>
			</div>
			<div class="space-y-2">
				<!-- OTS admin (local account) -->
				<div class="flex items-center justify-between rounded-lg border border-edge bg-code-surface p-3 text-sm">
					<div class="flex items-center gap-3">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-medium text-white">
							A
						</div>
						<div>
							<div class="text-ink">taylor@contoso.com</div>
							<div class="text-xs text-ink-muted">Owner &middot; Local account</div>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<span class="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-400">
							Active
						</span>
						<span class="text-xs text-ink-muted">Last login: Just now</span>
					</div>
				</div>
				<!-- Alice (SCIM-provisioned) -->
				<div
					class="flex items-center justify-between rounded-lg border border-edge bg-code-surface p-3 text-sm {deactivated
						? 'opacity-60'
						: ''}"
				>
					<div class="flex items-center gap-3">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white {deactivated
								? 'bg-edge-emphasis'
								: 'bg-blue-500'}"
						>
							AS
						</div>
						<div>
							<div class="text-ink {deactivated ? 'line-through' : ''}">alice@contoso.com</div>
							<div class="text-xs text-ink-muted">Member &middot; Provisioned via SCIM</div>
						</div>
					</div>
					<div class="flex items-center gap-3">
						{#if deactivated}
							<span class="rounded-full bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-400">
								Deactivated (via SCIM)
							</span>
							<span class="text-xs text-ink-muted">Sign-in blocked</span>
						{:else}
							<span class="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-400">
								Active
							</span>
							<span class="text-xs text-ink-muted">Last login: Never</span>
						{/if}
					</div>
				</div>
			</div>
			{#if deactivated}
				<p class="mt-4 text-xs text-ink-muted">
					Deactivated accounts are retained for audit. Data and history remain intact; authentication is blocked.
				</p>
			{/if}
		</div>
	</div>
</div>
