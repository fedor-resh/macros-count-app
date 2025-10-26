import { createApi } from '@reduxjs/toolkit/query/react';
import { AuthResponse, AuthTokenResponsePassword } from '@supabase/supabase-js';
import { Database } from '../../../database.types';
import { supabase } from '../../lib/supabase';
import { supabaseBaseQuery } from './supabase-base-query';

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

export interface FoodItem {
  name: string;
  weight: string;
  calories: string;
  protein: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
  name?: string;
}

export const supabaseApi = createApi({
  reducerPath: 'supabaseApi',
  baseQuery: supabaseBaseQuery(),
  tagTypes: ['Foods', 'Auth'],
  endpoints: (builder) => ({
    // Auth endpoints
    signIn: builder.mutation<
      AuthTokenResponsePassword['data'],
      { email: string; password: string }
      >({
      async queryFn({ email, password }) {
        const { data } = await supabase.auth.signInWithPassword({ email, password });
        return { data };
      },
      invalidatesTags: ['Auth'],
    }),

    signUp: builder.mutation<AuthResponse, {email: string, password: string, name: string}>({
      async queryFn({ email, password, name }) {
        const data = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        return { data };
      },
      invalidatesTags: ['Auth'],
    }),

    signOut: builder.mutation({
      async queryFn() {
        const resp = await supabase.auth.signOut();
        return { data: resp };
      },
      invalidatesTags: ['Auth'],
    }),

    signInWithGoogle: builder.mutation({
      async queryFn() {
        const resp = await supabase.auth.signInWithOAuth({ provider: 'google' });
        return { data: resp };
      },
      invalidatesTags: ['Auth'],
    }),

    // Food endpoints
    getTodayFoods: builder.query<Database['public']['Tables']['eaten_product']['Row'][], string>({
      async queryFn(userId) {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('eaten_product')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .order('created_at', { ascending: false })
        if (error) {
          return { error };
        }
        return {data};
      },
      providesTags: ['Foods'],
    }),

    addFood: builder.mutation<any, Database['public']['Tables']['eaten_product']['Insert']>({
      async queryFn(foodData) {
        const { data, error } = await supabase.from('eaten_product').insert(foodData).select();
        if (error) {
          return { error };
        }
        return { data };
      },
      invalidatesTags: ['Foods'],
    }),

    updateFood: builder.mutation<any, Database['public']['Tables']['eaten_product']['Update'] & { id: number }>({
      async queryFn({ id, ...foodData }) {
        const { data, error } = await supabase
          .from('eaten_product')
          .update(foodData)
          .eq('id', id)
          .select();
        if (error) {
          return { error };
        }
        return { data };
      },
      invalidatesTags: ['Foods'],
    }),

    deleteFood: builder.mutation<any, number>({
      async queryFn(id) {
        const { data, error } = await supabase
          .from('eaten_product')
          .delete()
          .eq('id', id)
          .select();
        if (error) {
          return { error };
        }
        return { data };
      },
      invalidatesTags: ['Foods'],
    }),
  }),
});

export const {
  useSignInMutation,
  useSignUpMutation,
  useSignOutMutation,
  useSignInWithGoogleMutation,
  useGetTodayFoodsQuery,
  useAddFoodMutation,
  useUpdateFoodMutation,
  useDeleteFoodMutation,
} = supabaseApi;
