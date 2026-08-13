import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ApiError,
	api,
	login,
	refreshSession,
	setAccessToken,
} from "./authClient";

describe("authClient", () => {
	afterEach(() => {
		setAccessToken(null);
		vi.unstubAllGlobals();
	});

	it("retries once after 401 by refreshing the session", async () => {
		setAccessToken("expired");
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url.endsWith("/auth/refresh") && init?.method === "POST") {
				return new Response(
					JSON.stringify({ accessToken: "fresh", user: { id: "u1", email: "a@example.com" } }),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}
			const auth = new Headers(init?.headers).get("Authorization");
			if (auth === "Bearer expired") {
				return new Response(JSON.stringify({ error: "invalid token" }), { status: 401 });
			}
			if (auth === "Bearer fresh") {
				return new Response(JSON.stringify([{ id: 1 }]), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			return new Response("unexpected", { status: 500 });
		});
		vi.stubGlobal("fetch", fetchMock);

		const rows = await api.get<{ id: number }[]>("/eaten-products");
		expect(rows).toEqual([{ id: 1 }]);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("login stores the access token", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				return new Response(
					JSON.stringify({ accessToken: "tok", user: { id: "u1", email: "a@example.com" } }),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}),
		);
		const session = await login("a@example.com", "secret1");
		expect(session.accessToken).toBe("tok");
		expect(session.user.email).toBe("a@example.com");
	});

	it("refreshSession returns null on 401", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(JSON.stringify({ error: "not authenticated" }), { status: 401 })),
		);
		expect(await refreshSession()).toBeNull();
	});

	it("surfaces API error messages", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(JSON.stringify({ error: "email already registered" }), { status: 409 })),
		);
		await expect(login("a@example.com", "secret1")).rejects.toBeInstanceOf(ApiError);
	});
});
