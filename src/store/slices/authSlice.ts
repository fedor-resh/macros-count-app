import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const initialState: AuthState = {
  session: null,
  user: null,
  loading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<Session | null>) => {
      state.session = action.payload;
      state.user = action.payload?.user ?? null;
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearAuth: (state) => {
      state.session = null;
      state.user = null;
      state.loading = false;
    },
  },
});

export const { setSession, setLoading, clearAuth } = authSlice.actions;
export default authSlice.reducer;
