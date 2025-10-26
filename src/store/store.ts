import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { supabaseApi } from './api/supabaseApi';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    [supabaseApi.reducerPath]: supabaseApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths in the state for serialization checks
        ignoredActions: ['auth/setSession'],
        ignoredPaths: ['auth.session', 'auth.user'],
      },
    }).concat(supabaseApi.middleware),
});

// Enable refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
