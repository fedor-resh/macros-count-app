import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import analyzeFoodPhoto from "../analyze-food-photo/index.ts";

const FUNCTIONS: Record<string, (req: Request) => Promise<Response>> = {
	"analyze-food-photo": analyzeFoodPhoto,
};

serve(async (req: Request) => {
	const url = new URL(req.url);
	const pathParts = url.pathname.split("/").filter(Boolean);

	// Expected path: /functions/v1/{function-name} or /{function-name}
	const functionName = pathParts[pathParts.length - 1];

	if (!functionName || !FUNCTIONS[functionName]) {
		return new Response(
			JSON.stringify({
				error: "Function not found",
				available: Object.keys(FUNCTIONS),
				path: url.pathname,
			}),
			{
				status: 404,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	try {
		return await FUNCTIONS[functionName](req);
	} catch (error) {
		console.error(`Error in function ${functionName}:`, error);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
});
