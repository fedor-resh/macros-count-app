import { supabase } from "./supabase";

// Base URL of the Go API. Relative "/api/v1" works both in dev (Vite proxy)
// and in production (Caddy routes /api/* to the Go service — same origin).
export const API_URL: string = import.meta.env.VITE_API_URL ?? "/api/v1";

export class ApiError extends Error {
	constructor(
		message: string,
		public statusCode?: number,
		public originalError?: unknown,
	) {
		super(message);
		this.name = "ApiError";
	}
}

export async function getAccessToken(): Promise<string> {
	const {
		data: { session },
		error,
	} = await supabase.auth.getSession();

	if (error || !session) {
		throw new ApiError("User not authenticated");
	}
	return session.access_token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	try {
		const token = await getAccessToken();

		const headers = new Headers(options.headers);
		headers.set("Authorization", `Bearer ${token}`);

		const response = await fetch(`${API_URL}${path}`, { ...options, headers });

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
			throw new ApiError(errorData.error || `Server error: ${response.status}`, response.status);
		}

		return (await response.json()) as T;
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		if (error instanceof Error) {
			throw new ApiError(`Request failed: ${error.message}`, undefined, error);
		}
		throw new ApiError("Request failed: Unknown error", undefined, error);
	}
}

export const api = {
	get<T>(path: string): Promise<T> {
		return request<T>(path);
	},
	post<T>(path: string, body: unknown): Promise<T> {
		return request<T>(path, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	},
	put<T>(path: string, body: unknown): Promise<T> {
		return request<T>(path, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	},
	patch<T>(path: string, body: unknown): Promise<T> {
		return request<T>(path, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	},
	del<T>(path: string): Promise<T> {
		return request<T>(path, { method: "DELETE" });
	},
	postFormData<T>(path: string, formData: FormData): Promise<T> {
		return request<T>(path, { method: "POST", body: formData });
	},
};
