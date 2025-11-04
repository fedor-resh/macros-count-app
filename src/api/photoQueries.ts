import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { compressImage } from "../utils/imageCompression";
import { queryClient } from "@/lib/queryClient";
import { foodKeys } from "./foodQueries";

export interface FoodAnalysis {
	food_name: string;
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
	weight: number;
	confidence: "low" | "medium" | "high";
	raw_response?: string;
}

export interface UploadPhotoResponse {
	success: boolean;
	publicUrl: string;
	filePath: string;
	analysis: FoodAnalysis;
}

export async function uploadPhoto(file: File): Promise<UploadPhotoResponse> {
	try {
		// Get the current session
		const {
			data: { session },
			error: authError,
		} = await supabase.auth.getSession();

		if (authError || !session) {
			throw new Error("User not authenticated");
		}

		// Compress image before upload
		const compressedFile = await compressImage(file);

		// Create form data
		const formData = new FormData();
		formData.append("photo", compressedFile);

		// Get the Supabase URL
		const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

		// Call the edge function
		const response = await fetch(`${supabaseUrl}/functions/v1/analyze-food-photo`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${session.access_token}`,
			},
			body: formData,
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
			throw new Error(errorData.error || `Server error: ${response.status}`);
		}

		const data: UploadPhotoResponse = await response.json();
		return data;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to upload photo: ${error.message}`);
		}
		throw new Error("Failed to upload photo: Unknown error");
	}
}

export function useUploadPhotoMutation() {
	return useMutation({
		mutationFn: uploadPhoto,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: foodKeys.all,
			});
		},
	});
}
