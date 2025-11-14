import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { EatenProduct } from "@/types/types";
import { compressImage } from "../utils/imageCompression";
import { foodKeys, getMondayOfWeek } from "./foodQueries";
import { fetchWithAuthFormData } from "./queryUtils";

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

export interface UploadPhotoPayload {
	file: File;
	date: string;
}

export async function uploadPhoto({
	file,
	date,
}: UploadPhotoPayload): Promise<UploadPhotoResponse> {
	const compressedFile = await compressImage(file);

	const formData = new FormData();
	formData.append("photo", compressedFile);
	formData.append("date", date);

	return fetchWithAuthFormData<UploadPhotoResponse>("analyze-food-photo", formData);
}

export function useUploadPhotoMutation() {
	return useMutation({
		mutationKey: ["uploadPhoto"],
		mutationFn: uploadPhoto,
		onMutate: async ({ date, file }) => {
			const monday = getMondayOfWeek(date);

			// Create a temporary URL for the image preview
			const imagePreviewUrl = URL.createObjectURL(file);

			// Create a temporary loading item with image
			const loadingItem: Partial<EatenProduct> = {
				id: -Date.now(),
				name: "Анализируем фото...",
				date: date,
				imageUrl: imagePreviewUrl,
				createdAt: new Date().toISOString(),
			};

			queryClient.setQueryData(foodKeys.weeklyFoods(monday), (old: EatenProduct[] = []) => {
				return [loadingItem as EatenProduct, ...old];
			});

			return { monday, imagePreviewUrl };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: foodKeys.all,
			});
		},
		onSettled: (_data, _error, _variables, context) => {
			if (context?.imagePreviewUrl) {
				URL.revokeObjectURL(context.imagePreviewUrl);
			}
		},
	});
}
