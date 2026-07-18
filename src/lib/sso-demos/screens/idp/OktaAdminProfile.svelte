<!--
  Okta Admin Console user profile editor mockup.
  Shows the admin editing Alice's profile attributes -- the change that
  triggers Okta's PUT /Users/{id} full-replace push to the SCIM server.
-->
<div class="flex h-full flex-col bg-slate-50">
	<!-- Top bar -->
	<div class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
		<div class="flex items-center gap-3">
			<div class="flex h-7 w-16 items-center justify-center rounded bg-blue-600 text-sm font-bold text-white">
				okta
			</div>
			<span class="hidden text-sm text-gray-500 sm:inline">Admin Console</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="hidden text-xs text-gray-500 sm:inline">okta-admin@contoso.com</span>
			<div
				class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
			>
				AD
			</div>
		</div>
	</div>
	<!-- Profile editor -->
	<div class="flex-1 p-4">
		<div class="mb-3 flex items-center gap-3">
			<div
				class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
			>
				AN
			</div>
			<div>
				<h2 class="text-sm font-semibold text-gray-900">Alice Nguyen</h2>
				<span class="text-xs text-gray-500">alice@contoso.com &middot; Edit profile</span>
			</div>
		</div>
		<form onsubmit={(e) => e.preventDefault()} class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="space-y-3">
				<div>
					<label for="okta-profile-display-name" class="mb-1 block text-xs font-medium text-gray-700">
						Display name
					</label>
					<input
						id="okta-profile-display-name"
						type="text"
						value="Alice Nguyen"
						readonly
						class="w-full rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label for="okta-profile-department" class="mb-1 block text-xs font-medium text-gray-700">
						Department
					</label>
					<input
						id="okta-profile-department"
						type="text"
						value="Engineering"
						readonly
						class="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					/>
				</div>
			</div>
			<div class="mt-4 flex items-center justify-end gap-2">
				<button
					type="button"
					class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					type="submit"
					class="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
				>
					Save
				</button>
			</div>
		</form>
	</div>
</div>
