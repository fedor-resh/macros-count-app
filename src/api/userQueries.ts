import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "../types/database.types";
import { supabase } from "../lib/supabase";
import type { ActivityLevel, Gender, Goal } from "@/utils/calorieCalculator";
import { type User, type UserTable } from "@/types/types";

// Query Keys
export const userKeys = {
	all: ["users"] as const,
	user: (userId: string) => ["users", userId] as const,
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
export function useGetUserGoalsQuery(userId: string) {
	return useQuery({
		queryKey: userKeys.user(userId),
		queryFn: async () => {
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

	return useMutation({
		mutationFn: async (userParams: Partial<User> & { id: string }) => {
			const { id, ...updateData } = userParams;
			const { data, error } = await supabase
				.from("users")
				.update(updateData)
				.eq("id", id)
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
				queryKey: userKeys.user(variables.id),
			});
		},
	});
}
