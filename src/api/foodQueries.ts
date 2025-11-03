import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "../types/database.types";
import { supabase } from "../lib/supabase";

export interface EatenProduct {
	id?: string;
	name: string;
	value: number;
	unit: string;
	kcalories: number;
	protein: number;
	date: string;
	user_id: string;
	created_at?: string;
}

// Query Keys
export const foodKeys = {
	all: ["foods"] as const,
	todayFoods: (date: string) => ["foods", date] as const,
	weeklyFoods: () => ["foods", "weekly"] as const,
};

// Queries
export function useGetTodayFoodsQuery(userId: string, date?: string) {
	const queryDate = date || new Date().toISOString().split("T")[0];

	return useQuery({
		queryKey: foodKeys.todayFoods(queryDate),
		queryFn: async () => {
			const { data, error } = await supabase
				.from("eaten_product")
				.select("*")
				.eq("user_id", userId)
				.eq("date", queryDate)
				.order("created_at", { ascending: false });

			if (error) {
				throw error;
			}
			return data as Database["public"]["Tables"]["eaten_product"]["Row"][];
		},
		enabled: !!userId,
	});
}

export function useGetWeeklyFoodsQuery(userId: string) {
	return useQuery({
		queryKey: foodKeys.weeklyFoods(),
		queryFn: async () => {
			// Calculate date range for last 7 days
			const today = new Date();
			const sevenDaysAgo = new Date(today);
			sevenDaysAgo.setDate(today.getDate() - 6);

			const startDate = sevenDaysAgo.toISOString().split("T")[0];
			const endDate = today.toISOString().split("T")[0];

			const { data, error } = await supabase
				.from("eaten_product")
				.select("*")
				.eq("user_id", userId)
				.gte("date", startDate)
				.lte("date", endDate)
				.order("date", { ascending: true });

			if (error) {
				throw error;
			}
			return data as Database["public"]["Tables"]["eaten_product"]["Row"][];
		},
		enabled: !!userId,
	});
}

// Mutations
export function useAddFoodMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			foodData: Database["public"]["Tables"]["eaten_product"]["Insert"],
		) => {
			const { data, error } = await supabase
				.from("eaten_product")
				.insert(foodData)
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

export function useUpdateFoodMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			params: Database["public"]["Tables"]["eaten_product"]["Update"] & {
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
			const { data, error } = await supabase
				.from("eaten_product")
				.delete()
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
