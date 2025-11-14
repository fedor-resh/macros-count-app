export function getOpenRouterApiKey(): string {
	const key = Deno.env.get("OPENROUTER_API_KEY");
	if (!key) {
		throw new Error("OpenRouter API key not configured");
	}
	return key;
}

export function getSiteUrl(): string {
	return Deno.env.get("SITE_URL") || "https://macros-count-app.com";
}

export function getSiteName(): string {
	return Deno.env.get("SITE_NAME") || "Bite";
}

export function getSupabaseConfig() {
	return {
		url: Deno.env.get("SUPABASE_URL") ?? "",
		anonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
	};
}
