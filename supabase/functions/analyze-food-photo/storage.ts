import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function uploadImage(
	supabaseClient: SupabaseClient,
	fullPath: string,
	fileBuffer: ArrayBuffer,
	contentType: string,
): Promise<{ error: Error | null }> {
	const uploadResult = await supabaseClient.storage.from("images").upload(fullPath, fileBuffer, {
		contentType,
		cacheControl: "3600",
		upsert: false,
	});

	if (uploadResult.error) {
		return { error: new Error(`Failed to upload: ${uploadResult.error.message}`) };
	}

	return { error: null };
}

export function getPublicUrl(supabaseClient: SupabaseClient, fullPath: string): string {
	const {
		data: { publicUrl },
	} = supabaseClient.storage.from("images").getPublicUrl(fullPath);
	return publicUrl;
}
