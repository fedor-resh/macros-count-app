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

export interface AuthUser {
	id: string;
	email: string;
}

export interface AuthSession {
	accessToken: string;
	user: AuthUser;
}

let accessToken: string | null = null;

export async function getAccessToken(): Promise<string> {
	if (accessToken) {
		return accessToken;
	}
	const session = await refreshSession();
	if (!session) {
		throw new ApiError("User not authenticated");
	}
	return session.accessToken;
}

export function setAccessToken(token: string | null) {
	accessToken = token;
}

async function parseError(response: Response): Promise<string> {
	const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
	return errorData.error || `Server error: ${response.status}`;
}

export async function refreshSession(): Promise<AuthSession | null> {
	const response = await fetch(`${API_URL}/auth/refresh`, {
		method: "POST",
		credentials: "include",
	});
	if (!response.ok) {
		accessToken = null;
		return null;
	}
	const session = (await response.json()) as AuthSession;
	accessToken = session.accessToken;
	return session;
}

export async function login(email: string, password: string): Promise<AuthSession> {
	return postAuth("/auth/login", { email, password });
}

export async function register(email: string, password: string): Promise<AuthSession> {
	return postAuth("/auth/register", { email, password });
}

export async function logout(): Promise<void> {
	try {
		await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
	} finally {
		accessToken = null;
	}
}

export function googleStartUrl(): string {
	return `${API_URL}/auth/google/start`;
}

async function postAuth(path: string, body: unknown): Promise<AuthSession> {
	const response = await fetch(`${API_URL}${path}`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		throw new ApiError(await parseError(response), response.status);
	}
	const session = (await response.json()) as AuthSession;
	accessToken = session.accessToken;
	return session;
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
	try {
		const token = await getAccessToken();
		const headers = new Headers(options.headers);
		headers.set("Authorization", `Bearer ${token}`);

		const response = await fetch(`${API_URL}${path}`, {
			...options,
			headers,
			credentials: "include",
		});

		if (response.status === 401 && !retried) {
			const session = await refreshSession();
			if (session) {
				return request<T>(path, options, true);
			}
			throw new ApiError("User not authenticated", 401);
		}

		if (!response.ok) {
			throw new ApiError(await parseError(response), response.status);
		}

		if (response.status === 204) {
			return undefined as T;
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
