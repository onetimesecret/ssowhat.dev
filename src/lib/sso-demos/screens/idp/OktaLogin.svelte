<!--
  Okta login screen mockup.
  Shows the Okta authentication UI with username/password fields.
-->
<div class="flex h-full items-center justify-center bg-slate-50 p-4">
	<div class="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
		<div class="mb-6 text-center">
			<!-- Okta logo placeholder -->
			<div
				class="mx-auto mb-4 flex h-10 w-24 items-center justify-center rounded bg-blue-600 font-bold text-white"
			>
				okta
			</div>
			<h2 class="text-xl font-medium text-gray-900">Sign In</h2>
		</div>
		<form onsubmit={(e) => e.preventDefault()} class="space-y-4">
			<div>
				<label for="okta-email" class="mb-1 block text-sm font-medium text-gray-700">
					Username
				</label>
				<input
					id="okta-email"
					type="text"
					value="alice@contoso.com"
					readonly
					class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				/>
			</div>
			<div>
				<label for="okta-password" class="mb-1 block text-sm font-medium text-gray-700">
					Password
				</label>
				<input
					id="okta-password"
					type="password"
					autocomplete="current-password"
					placeholder="Password"
					readonly
					class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				/>
			</div>
			<div class="flex items-center justify-between text-sm">
				<label for="okta-remember" class="flex items-center gap-2 text-gray-600">
					<input id="okta-remember" type="checkbox" class="rounded border-gray-300" />
					Remember me
				</label>
				<span role="link" aria-disabled="true" class="cursor-default text-blue-600">
					Need help signing in?
				</span>
			</div>
			<button
				type="submit"
				class="w-full rounded-md bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700"
			>
				Sign In
			</button>
		</form>
	</div>
</div>
