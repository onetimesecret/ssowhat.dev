<!--
  Okta Single Logout propagation mockup.
  Shows Okta signing the user out of session participants via
  front-channel iframes -- including one app that never responds.
-->
<div class="flex h-full flex-col bg-slate-50">
	<!-- Top bar -->
	<div class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
		<div class="flex items-center gap-3">
			<div class="flex h-7 w-16 items-center justify-center rounded bg-blue-600 text-sm font-bold text-white">
				okta
			</div>
			<span class="hidden text-sm text-gray-500 sm:inline">Signing out</span>
		</div>
		<span class="hidden text-xs text-gray-500 sm:inline">alice@contoso.com</span>
	</div>
	<!-- Sign-out progress -->
	<div class="flex flex-1 items-center justify-center p-4">
		<div class="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<h2 class="text-sm font-semibold text-gray-800">Signing you out of your apps&hellip;</h2>
			<ul class="mt-4 space-y-3">
				<li class="flex items-center justify-between text-sm">
					<span class="flex items-center gap-2 text-gray-700">
						<span class="flex h-7 w-7 items-center justify-center rounded bg-red-600 text-sm text-white">
							{'\u{1F510}'}
						</span>
						Onetime Secret
					</span>
					<span class="font-medium text-emerald-600">Signed out &#x2713;</span>
				</li>
				<li class="flex items-center justify-between text-sm">
					<span class="flex items-center gap-2 text-gray-700">
						<span class="flex h-7 w-7 items-center justify-center rounded bg-amber-500 text-sm text-white">
							{'\u{1F4D6}'}
						</span>
						Team Wiki
					</span>
					<span class="flex items-center gap-1.5 font-medium text-amber-600">
						<span
							class="h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent motion-reduce:animate-none"
							aria-hidden="true"
						></span>
						No response&hellip;
					</span>
				</li>
			</ul>
			<p class="mt-4 text-xs text-gray-500">
				Some applications may not confirm sign-out.
			</p>
		</div>
	</div>
</div>
