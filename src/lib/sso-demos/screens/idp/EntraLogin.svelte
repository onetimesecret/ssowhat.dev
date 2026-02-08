<!--
  Microsoft Entra ID (Azure AD) login screen mockup.
  Shows the Microsoft sign-in experience with email and password fields.
-->
<div class="flex h-full bg-slate-900">
	<div class="flex flex-1 items-center justify-center p-8">
		<div class="w-full max-w-sm">
			<div class="mb-8">
				<svg class="h-7 w-28" viewBox="0 0 120 28">
					<rect x="0" y="0" width="12" height="12" fill="#f25022" />
					<rect x="14" y="0" width="12" height="12" fill="#7fba00" />
					<rect x="0" y="14" width="12" height="12" fill="#00a4ef" />
					<rect x="14" y="14" width="12" height="12" fill="#ffb900" />
					<text x="34" y="19" fill="#94a3b8" font-size="15" font-family="Segoe UI, sans-serif">
						Microsoft
					</text>
				</svg>
			</div>
			<h1 class="mb-2 text-2xl text-slate-100">Sign in</h1>
			<form onsubmit={(e) => e.preventDefault()}>
				<label for="entra-email" class="sr-only">Email</label>
				<input
					id="entra-email"
					type="email"
					value="alice@contoso.com"
					readonly
					class="mb-4 w-full border-0 border-b-2 border-blue-500 bg-transparent px-0 py-2 text-slate-200 focus:outline-none"
				/>
				<label for="entra-password" class="sr-only">Password</label>
				<input
					id="entra-password"
					type="password"
					autocomplete="current-password"
					placeholder="Password"
					readonly
					class="mb-6 w-full border-0 border-b border-slate-600 bg-transparent px-0 py-2 text-slate-200 placeholder-slate-500 focus:outline-none"
				/>
				<button type="submit" class="w-full bg-blue-600 py-2 font-medium text-white hover:bg-blue-500">
					Sign in
				</button>
			</form>
			<div class="mt-4 text-sm text-slate-400">
				<span class="cursor-pointer text-blue-400 hover:text-blue-300">
					Can't access your account?
				</span>
			</div>
		</div>
	</div>
</div>
