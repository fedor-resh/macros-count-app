import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FUNCTIONS: Record<string, string> = {
  "analyze-food-photo": "../analyze-food-photo/index.ts",
};

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  
  // Expected path: /functions/v1/{function-name}
  // or just /{function-name}
  const functionName = pathParts[pathParts.length - 1];
  
  if (!functionName || !FUNCTIONS[functionName]) {
    return new Response(
      JSON.stringify({ 
        error: "Function not found",
        available: Object.keys(FUNCTIONS) 
      }),
      { 
        status: 404, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }

  try {
    const modulePath = FUNCTIONS[functionName];
    const module = await import(modulePath);
    
    // Call the default export or handler
    if (typeof module.default === "function") {
      return await module.default(req);
    }
    
    return new Response(
      JSON.stringify({ error: "Function has no default export" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`Error in function ${functionName}:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

