import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { queryClient } from "@/lib/queryClient";
import type { EatenProduct } from "@/types/types";
import { compressImage } from "../utils/imageCompression";
import { foodKeys } from "./foodKey";
import { getMondayOfWeek } from "./foodQueries";
import { trackPendingAnalysis } from "./photoAnalysisTracker";

export type PhotoAnalysisStatus = "pending" | "completed" | "error";

export interface UploadPhotoResponse {
	id: number;
	status: PhotoAnalysisStatus;
	imageUrl: string;
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

	return api.postFormData<UploadPhotoResponse>("/photos/analyze", formData);
}

export function useUploadPhotoMutation() {
	return useMutation({
		mutationKey: ["uploadPhoto"],
		mutationFn: uploadPhoto,
		onMutate: async ({ date, file }) => {
			const monday = getMondayOfWeek(date);

			const imagePreviewUrl = URL.createObjectURL(file);

			const loadingItem: Partial<EatenProduct> = {
				id: -Date.now(),
				name: "Фото загружено, анализируем...",
				date,
				imageUrl: imagePreviewUrl,
				createdAt: new Date().toISOString(),
				status: "pending",
			};

			queryClient.setQueryData(foodKeys.weeklyFoods(monday), (old: EatenProduct[] = []) => {
				return [loadingItem as EatenProduct, ...old];
			});

			return { monday, imagePreviewUrl };
		},
		onSuccess: (data) => {
			trackPendingAnalysis(data.id);
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
