import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types/types";
import { api } from "../lib/apiClient";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

// Query Keys
export const userKeys = {
	all: ["users"] as const,
	user: (userId: string | null | undefined) => ["users", userId ?? "anonymous"] as const,
};

// Auth Mutations
export function useSignInMutation() {
	return useMutation({
		mutationFn: async ({ email, password }: { email: string; password: string }) => {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});
			if (error) {
				throw error;
			}
			return data;
		},
	});
}

export function useSignUpMutation() {
	return useMutation({
		mutationFn: async ({
			email,
			password,
			name,
		}: {
			email: string;
			password: string;
			name?: string;
		}) => {
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: name ? { data: { name } } : undefined,
			});
			if (error) {
				throw error;
			}
			return data;
		},
	});
}

export function useSignInWithGoogleMutation() {
	return useMutation({
		mutationFn: async () => {
			const { data, error } = await supabase.auth.signInWithOAuth({
				provider: "google",
			});
			if (error) {
				throw error;
			}
			return data;
		},
	});
}

// User Goals Queries
export function useGetUserGoalsQuery() {
	const userId = useAuthStore((state) => state.user?.id);
	return useQuery({
		queryKey: userKeys.user(userId),
		queryFn: async () => {
			if (!userId) {
				throw new Error("User is not authenticated");
			}
			return await api.get<User>("/me");
		},
		enabled: !!userId,
	});
}

export function useUpdateUserGoalsMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			caloriesGoal,
			proteinGoal,
		}: {
			userId: string;
			caloriesGoal: number;
			proteinGoal: number;
		}) => {
			return await api.put<User>("/me/goals", { caloriesGoal, proteinGoal });
		},
		onSuccess: (_, variables) => {
			// Invalidate user queries
			queryClient.invalidateQueries({
				queryKey: userKeys.user(variables.userId),
			});
		},
	});
}

export function useUpdateUserParamsMutation() {
	const queryClient = useQueryClient();
	const userId = useAuthStore((state) => state.user?.id);

	return useMutation({
		mutationFn: async (userParams: Partial<User>) => {
			if (!userId) {
				throw new Error("User is not authenticated");
			}
			return await api.patch<User>("/me", userParams);
		},
		onSuccess: () => {
			if (!userId) {
				return;
			}
			queryClient.invalidateQueries({
				queryKey: userKeys.user(userId),
			});
		},
	});
}
