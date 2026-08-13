import { create } from "zustand";
import {
	type AuthUser,
	login as loginRequest,
	logout as logoutRequest,
	refreshSession,
	register as registerRequest,
	setAccessToken,
} from "../lib/authClient";

interface AuthState {
	user: AuthUser | null;
	loading: boolean;
	setUser: (user: AuthUser | null) => void;
	signIn: (email: string, password: string) => Promise<void>;
	signUp: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	loading: true,

	setUser: (user) => {
		set({ user, loading: false });
	},

	signIn: async (email, password) => {
		const session = await loginRequest(email, password);
		set({ user: session.user, loading: false });
	},

	signUp: async (email, password) => {
		const session = await registerRequest(email, password);
		set({ user: session.user, loading: false });
	},

	signOut: async () => {
		await logoutRequest();
		set({ user: null });
	},

	initialize: async () => {
		try {
			const session = await refreshSession();
			set({
				user: session?.user ?? null,
				loading: false,
			});
		} catch {
			setAccessToken(null);
			set({ user: null, loading: false });
		}
	},
}));
