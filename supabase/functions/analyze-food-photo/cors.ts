export const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function createCorsResponse(body: string, status = 200): Response {
	return new Response(body, {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}

export function handleCorsPreflight(): Response {
	return new Response("ok", { headers: corsHeaders });
}
