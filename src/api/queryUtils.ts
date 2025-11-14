import { supabase } from "../lib/supabase";

export interface FetchWithAuthOptions extends RequestInit {
	headers?: HeadersInit;
}

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

/**
 * Wrapper for authenticated Supabase edge function requests
 */
export async function fetchWithAuth<T>(
	functionName: string,
	options: FetchWithAuthOptions = {},
): Promise<T> {
	try {
		// Get the current session
		const {
			data: { session },
			error: authError,
		} = await supabase.auth.getSession();

		if (authError || !session) {
			throw new ApiError("User not authenticated");
		}

		// Get the Supabase URL
		const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

		// Merge headers with authorization
		const headers = new Headers(options.headers);
		headers.set("Authorization", `Bearer ${session.access_token}`);

		// Call the edge function
		const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
			...options,
			headers,
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
			throw new ApiError(errorData.error || `Server error: ${response.status}`, response.status);
		}

		const data: T = await response.json();
		return data;
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

/**
 * Wrapper for authenticated Supabase edge function requests with FormData
 */
export async function fetchWithAuthFormData<T>(
	functionName: string,
	formData: FormData,
	options: Omit<FetchWithAuthOptions, "body"> = {},
): Promise<T> {
	return fetchWithAuth<T>(functionName, {
		...options,
		method: "POST",
		body: formData,
	});
}
