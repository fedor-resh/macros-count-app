import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Database } from '../../database.types';
import { supabase } from '../lib/supabase';
import { ActivityLevel, Gender, Goal } from '../../utils/calorieCalculator';

// Query Keys
export const userKeys = {
  all: ['users'] as const,
  user: (userId: string) => ['users', userId] as const,
};

// Auth Mutations
export function useSignInMutation() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      return data;
    },
  });
}

export function useSignUpMutation() {
  return useMutation({
    mutationFn: async ({ email, password, name }: { email: string; password: string; name: string }) => {
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
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }
      return data as Database['public']['Tables']['users']['Row'];
    },
    select: (data) => ({
      ...data,
      activityLevel: data.activity_level as ActivityLevel,
      goal: data.goal as Goal,
      gender: data.gender as Gender,
    }),
    enabled: !!userId,
  });
}

export function useUpdateUserGoalsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId,
      caloriesGoal, 
      proteinGoal 
    }: { 
      userId: string;
      caloriesGoal: number; 
      proteinGoal: number;
    }) => {
      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: userId,
          calories_goal: caloriesGoal,
          protein_goal: proteinGoal,
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
    mutationFn: async ({
      userId,
      weight,
      height,
      age,
      gender,
      activityLevel,
      goal,
    }: {
      userId: string;
      weight: number | null;
      height: number | null;
      age: number | null;
      gender: Gender;
      activityLevel: ActivityLevel;
      goal: Goal;
    }) => {
      const { data, error } = await supabase
        .from('users')
        .update({
          weight,
          height,
          age,
          gender,
          activity_level: activityLevel,
          goal,
        })
        .eq('id', userId)
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

