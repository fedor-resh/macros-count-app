import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import type { EatenProduct, InsertEatenProduct } from "../types/types";
import { getFormattedDate } from "../utils/dateUtils";

// Query Keys
export const foodKeys = {
	all: ["foods"] as const,
	weeklyFoods: (monday: string) => ["foods", monday] as const,
};

export function getMondayOfWeek(date: string) {
	const monday = new Date(date);
	if (monday.getDay() === 0) {
		monday.setDate(monday.getDate() - 6);
	} else {
		monday.setDate(monday.getDate() - monday.getDay() + 1);
	}
	return getFormattedDate(monday);
}

export function useGetWeeklyFoodsQuery(date: string | null) {
	const userId = useAuthStore((state) => state.user?.id);
	const monday = getMondayOfWeek(date ?? new Date().toISOString());
	return useQuery({
		queryKey: foodKeys.weeklyFoods(monday),
		queryFn: async () => {
			if (!userId) {
				throw new Error("User is not authenticated");
			}
			// Calculate date range for last 7 days
			const endDate = new Date(monday);
			endDate.setDate(endDate.getDate() + 6);
			console.log("end", endDate.toLocaleDateString("ru-RU", { weekday: "short" }));
			const { data, error } = await supabase
				.from("eaten_product")
				.select("*")
				.eq("userId", userId)
				.gte("date", monday)
				.lte("date", getFormattedDate(endDate))
				.order("createdAt", { ascending: false });

			if (error) {
				throw error;
			}
			return data as EatenProduct[];
		},
		enabled: !!userId,
	});
}

export function useGetFoodsHistoryQuery(limit = 200) {
	const userId = useAuthStore((state) => state.user?.id);
	return useQuery({
		queryKey: [],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("eaten_product")
				.select("*")
				.eq("userId", userId)
				.order("createdAt", { ascending: false })
				.limit(limit);

			if (error) {
				throw error;
			}

			return data as EatenProduct[];
		},
		enabled: !!userId,
		staleTime: 1000 * 60 * 5,
	});
}

// Mutations
export function useAddFoodMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (foodData: InsertEatenProduct) => {
			const { data, error } = await supabase.from("eaten_product").insert(foodData).select();

			if (error) {
				throw error;
			}
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: foodKeys.all,
			});
		},
	});
}

export function useUpdateFoodMutation() {
	return useMutation({
		mutationFn: async (
			params: InsertEatenProduct & {
				id: number;
			},
		) => {
			const { id, ...foodData } = params;
			const { data, error } = await supabase
				.from("eaten_product")
				.update(foodData)
				.eq("id", id)
				.select();

			if (error) {
				throw error;
			}
			return data;
		},
		meta: { invalidateKeys: [foodKeys.all] },
	});
}

export function useDeleteFoodMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: number) => {
			const { data, error } = await supabase.from("eaten_product").delete().eq("id", id).select();

			if (error) {
				throw error;
			}
			return data;
		},
		onMutate: async (id) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: foodKeys.all });

			// Snapshot previous values for rollback
			const previousQueries: Record<string, unknown> = {};

			// Get all food queries and optimistically update them
			const allFoodQueries = queryClient.getQueriesData({ queryKey: foodKeys.all });
			for (const [queryKey, data] of allFoodQueries) {
				if (Array.isArray(data)) {
					previousQueries[JSON.stringify(queryKey)] = data;
					queryClient.setQueryData(
						queryKey,
						data.filter((item: { id: number }) => item.id !== id),
					);
				}
			}

			return { previousQueries };
		},
		onError: (_err, _id, context) => {
			// Rollback on error
			if (context?.previousQueries) {
				for (const [queryKey, data] of Object.entries(context.previousQueries)) {
					queryClient.setQueryData(JSON.parse(queryKey), data);
				}
			}
		},
		onSettled: () => {
			// No need to invalidate since we've already updated optimistically
		},
	});
}
