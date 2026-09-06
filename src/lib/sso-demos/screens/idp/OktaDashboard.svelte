<!--
  Okta end-user dashboard mockup.
  Shows the app launcher with tiles the user clicks to start
  IdP-initiated SSO into assigned applications.
-->
<div class="flex h-full flex-col bg-slate-50">
	<!-- Top bar -->
	<div class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
		<div class="flex items-center gap-3">
			<div class="flex h-7 w-16 items-center justify-center rounded bg-blue-600 text-sm font-bold text-white">
				okta
			</div>
			<span class="hidden text-sm text-gray-500 sm:inline">My Apps</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="hidden text-xs text-gray-500 sm:inline">alice@contoso.com</span>
			<div
				class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
			>
				AS
			</div>
		</div>
	</div>
	<!-- App grid -->
	<div class="flex-1 p-4">
		<h2 class="mb-3 text-sm font-semibold text-gray-700">Work Apps</h2>
		<div class="grid grid-cols-3 gap-3">
			<!-- App tile (highlighted target) -->
			<div
				class="flex flex-col items-center gap-2 rounded-lg border-2 border-blue-500 bg-white p-3 shadow-md ring-2 ring-blue-200"
			>
				<div class="flex h-10 w-10 items-center justify-center rounded bg-red-600 text-lg text-white">
					{'\u{1F510}'}
				</div>
				<span class="text-center text-xs font-medium text-gray-800">Onetime Secret</span>
			</div>
			<div class="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
				<div class="flex h-10 w-10 items-center justify-center rounded bg-emerald-600 text-lg text-white">
					{'\u{1F4E7}'}
				</div>
				<span class="text-center text-xs font-medium text-gray-600">Mail</span>
			</div>
			<div class="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
				<div class="flex h-10 w-10 items-center justify-center rounded bg-indigo-600 text-lg text-white">
					{'\u{1F4C1}'}
				</div>
				<span class="text-center text-xs font-medium text-gray-600">Drive</span>
			</div>
			<div class="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
				<div class="flex h-10 w-10 items-center justify-center rounded bg-amber-500 text-lg text-white">
					{'\u{1F4CA}'}
				</div>
				<span class="text-center text-xs font-medium text-gray-600">Analytics</span>
			</div>
			<div class="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
				<div class="flex h-10 w-10 items-center justify-center rounded bg-sky-500 text-lg text-white">
					{'\u{1F4AC}'}
				</div>
				<span class="text-center text-xs font-medium text-gray-600">Chat</span>
			</div>
			<div class="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
				<div class="flex h-10 w-10 items-center justify-center rounded bg-slate-600 text-lg text-white">
					{'\u{1F6E0}'}
				</div>
				<span class="text-center text-xs font-medium text-gray-600">Tickets</span>
			</div>
		</div>
	</div>
</div>
