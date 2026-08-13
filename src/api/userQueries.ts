import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types/types";
import { api } from "../lib/apiClient";
import { useAuthStore } from "../stores/authStore";

export const userKeys = {
	all: ["users"] as const,
	user: (userId: string | null | undefined) => ["users", userId ?? "anonymous"] as const,
};

export function useSignInMutation() {
	const signIn = useAuthStore((state) => state.signIn);
	return useMutation({
		mutationFn: async ({ email, password }: { email: string; password: string }) => {
			await signIn(email, password);
		},
	});
}

export function useSignUpMutation() {
	const signUp = useAuthStore((state) => state.signUp);
	return useMutation({
		mutationFn: async ({ email, password }: { email: string; password: string }) => {
			await signUp(email, password);
		},
	});
}

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
