import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/apiClient";
import { useAuthStore } from "../stores/authStore";
import type { EatenProduct, InsertEatenProduct, Product } from "../types/types";
import { getFormattedDate } from "../utils/dateUtils";
import { foodKeys } from "./foodKey";
import { foodService } from "./services/foodService";

export function useGetFoodsInRangeQuery(from: Date | null, to: Date | null) {
	const fromStr = from ? getFormattedDate(from) : null;
	const toStr = to ? getFormattedDate(to) : null;
	const userId = useAuthStore((state) => state.user?.id);
	const hasRange = Boolean(from && to);

	return useQuery({
		queryKey: foodKeys.foodsInRange(fromStr, toStr),
		queryFn: async () => {
			if (!userId) {
				throw new Error("User is not authenticated");
			}
			if (!from || !to || !fromStr || !toStr) {
				return [];
			}

			return await foodService.getFoodInRange(fromStr, toStr);
		},
		enabled: !!userId && hasRange,
	});
}

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
			const params = new URLSearchParams({ from: monday, to: getFormattedDate(endDate) });
			return await api.get<EatenProduct[]>(`/eaten-products?${params}`);
		},
		enabled: !!userId,
	});
}

export function useGetFoodsHistoryQuery(query = "", limit = 50) {
	const userId = useAuthStore((state) => state.user?.id);
	return useQuery({
		queryKey: ["foods-history", query, limit],
		queryFn: async () => {
			const params = new URLSearchParams({ limit: String(limit) });
			if (query.trim()) {
				params.set("search", query.trim());
			}
			return await api.get<EatenProduct[]>(`/eaten-products?${params}`);
		},
		enabled: !!userId,
		staleTime: 1000 * 60 * 5,
	});
}

// Search products from products table
export function useSearchProductsQuery(query: string, limit = 20) {
	return useQuery({
		queryKey: foodKeys.products(query),
		queryFn: async () => {
			if (!query.trim()) {
				return [];
			}

			const params = new URLSearchParams({ search: query.trim(), limit: String(limit) });
			return await api.get<Product[]>(`/products?${params}`);
		},
		enabled: query.trim().length > 0,
		staleTime: 1000 * 60 * 10, // 10 minutes
	});
}

// Mutations
export function useAddFoodMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (foodData: InsertEatenProduct) => {
			return await api.post<EatenProduct[]>("/eaten-products", foodData);
		},
		onSuccess: () => {
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
			return await api.patch<EatenProduct[]>(`/eaten-products/${id}`, foodData);
		},
		onSuccess: () => {
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
			return await api.del<EatenProduct[]>(`/eaten-products/${id}`);
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
