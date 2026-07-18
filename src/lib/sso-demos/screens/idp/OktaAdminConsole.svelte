<!--
  Okta Admin Console mockup.
  Shows the OTS application's Assignments tab where an administrator
  assigns users to the app -- the click that kicks off SCIM provisioning.
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
	<!-- App header -->
	<div class="border-b border-gray-200 bg-white px-4 pt-3">
		<div class="flex items-center gap-3">
			<div class="flex h-9 w-9 items-center justify-center rounded bg-red-600 text-base text-white">
				{'\u{1F510}'}
			</div>
			<div>
				<h2 class="text-sm font-semibold text-gray-900">Onetime Secret</h2>
				<span class="text-xs text-emerald-700">Provisioning: enabled</span>
			</div>
		</div>
		<!-- Tabs -->
		<div class="mt-3 flex gap-4 text-xs">
			<span class="pb-2 text-gray-500">General</span>
			<span class="pb-2 text-gray-500">Sign On</span>
			<span class="pb-2 text-gray-500">Provisioning</span>
			<span class="border-b-2 border-blue-600 pb-2 font-semibold text-blue-700">Assignments</span>
		</div>
	</div>
	<!-- Assignments panel -->
	<div class="flex-1 p-4">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="text-sm font-semibold text-gray-700">People</h3>
			<button
				type="button"
				class="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
			>
				Assign
			</button>
		</div>
		<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
			<div class="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
				<div class="flex items-center gap-3">
					<div
						class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
					>
						AS
					</div>
					<div>
						<div class="text-xs font-medium text-gray-800">Alice Smith</div>
						<div class="text-xs text-gray-500">alice@contoso.com</div>
					</div>
				</div>
				<span
					class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
				>
					Assigned
				</span>
			</div>
			<div class="px-3 py-2.5 text-xs text-gray-400">No other people assigned</div>
		</div>
	</div>
</div>
