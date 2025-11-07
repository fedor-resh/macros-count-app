import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { EatenProduct, InsertEatenProduct } from "../types/types";
import { getFormattedDate } from "../utils/dateUtils";

// Query Keys
export const foodKeys = {
	all: ["foods"] as const,
	todayFoods: (date: string) => ["foods", date] as const,
	weeklyFoods: (monday: string) => ["foods", "weekly", monday] as const,
};

export function getMondayOfWeek(date: string) {
	const monday = new Date(date);
	if(monday.getDay() === 0) {
		monday.setDate(monday.getDate() - 6);
	} else {
		monday.setDate(monday.getDate() - monday.getDay() + 1);
	}
	console.log('monday', monday, monday.toLocaleDateString('ru-RU', { weekday: 'short' }));
	return getFormattedDate(monday);
}

export function useGetWeeklyFoodsQuery(userId: string, date: string | null) {
	const monday = getMondayOfWeek(date ?? new Date().toISOString());
	return useQuery({
		queryKey: foodKeys.weeklyFoods(monday),
		queryFn: async () => {
			// Calculate date range for last 7 days
			const endDate = new Date(monday);
			endDate.setDate(endDate.getDate() + 6);
			console.log('end',endDate.toLocaleDateString('ru-RU', { weekday: 'short' }));
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
			// Invalidate all food queries
			queryClient.invalidateQueries({
				queryKey: foodKeys.all,
			});
		},
	});
}

export function useUpdateFoodMutation() {
	const queryClient = useQueryClient();

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
		onSuccess: () => {
			// Invalidate all food queries
			queryClient.invalidateQueries({
				queryKey: foodKeys.all,
			});
		},
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
