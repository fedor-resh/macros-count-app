import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";
import { getSupabaseConfig } from "./config.ts";

export function createSupabaseClient(authHeader: string | null): SupabaseClient {
	const { url, anonKey } = getSupabaseConfig();
	const authToken = authHeader || "";
	return createClient(url, anonKey, {
		global: {
			headers: { Authorization: authToken },
		},
	});
}

export async function getAuthenticatedUser(
	supabaseClient: SupabaseClient,
): Promise<{ user: User | null; error: Error | null }> {
	const {
		data: { user },
		error: authError,
	} = await supabaseClient.auth.getUser();

	if (authError || !user) {
		return { user: null, error: new Error("Unauthorized") };
	}

	return { user, error: null };
}
