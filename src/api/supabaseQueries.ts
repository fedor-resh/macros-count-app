import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Database } from '../../database.types';
import { supabase } from '../lib/supabase';

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
  all: ['foods'] as const,
  todayFoods: (userId: string) => ['foods', 'today', userId] as const,
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

// Queries
export function useGetTodayFoodsQuery(userId: string) {
  return useQuery({
    queryKey: foodKeys.todayFoods(userId),
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('eaten_product')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      return data as Database['public']['Tables']['eaten_product']['Row'][];
    },
    enabled: !!userId,
  });
}

// Mutations
export function useAddFoodMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      foodData: Database['public']['Tables']['eaten_product']['Insert']
    ) => {
      const { data, error } = await supabase
        .from('eaten_product')
        .insert(foodData)
        .select();

      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate the today foods query for the user
      queryClient.invalidateQueries({
        queryKey: foodKeys.todayFoods(variables.user_id!),
      });
    },
  });
}

export function useUpdateFoodMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      params: Database['public']['Tables']['eaten_product']['Update'] & { id: number }
    ) => {
      const { id, ...foodData } = params;
      const { data, error } = await supabase
        .from('eaten_product')
        .update(foodData)
        .eq('id', id)
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
        .from('eaten_product')
        .delete()
        .eq('id', id)
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

