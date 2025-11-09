import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "../types/database.types";
import { supabase } from "../lib/supabase";
import type { User } from "@/types/types";
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
			name: string;
		}) => {
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: { data: { name } },
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
			const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();

			if (error) {
				throw error;
			}
			return data as Database["public"]["Tables"]["users"]["Row"];
		},
		enabled: !!userId,
	});
}

export function useUpdateUserGoalsMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			userId,
			caloriesGoal,
			proteinGoal,
		}: {
			userId: string;
			caloriesGoal: number;
			proteinGoal: number;
		}) => {
			const { data, error } = await supabase
				.from("users")
				.upsert({
					id: userId,
					caloriesGoal,
					proteinGoal,
				})
				.select()
				.single();

			if (error) {
				throw error;
			}
			return data;
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
			const { data, error } = await supabase
				.from("users")
				.update(userParams)
				.eq("id", userId)
				.select()
				.single();

			if (error) {
				throw error;
			}
			return data;
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
