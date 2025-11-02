import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get("photo") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No photo provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `photo-${Date.now()}.${fileExt}`;
    const fullPath = `${user.id}/${fileName}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseClient.storage
      .from("images")
      .upload(fullPath, fileBuffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: `Failed to upload: ${uploadError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseClient.storage.from("images").getPublicUrl(fullPath);

    // Send to OpenRouter LLM for analysis
    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    const siteUrl = Deno.env.get("SITE_URL") || "https://macros-count-app.com";
    const siteName = Deno.env.get("SITE_NAME") || "Macros Count App";

    if (!openRouterApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenRouter API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const llmResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterApiKey}`,
          "HTTP-Referer": siteUrl,
          "X-Title": siteName,
        },
        body: JSON.stringify({
          model: "qwen/qwen3-vl-235b-a22b-instruct",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this food image and provide nutritional information in JSON format with the following structure:
{
  "food_name": "краткое название продукта (на русском языке)",
  "calories": estimated calories (number),
  "protein": estimated protein in grams (number),
  "carbs": estimated carbs in grams (number),
  "fats": estimated fats in grams (number),
  "weight": estimated weight in grams (number),
  "confidence": confidence level (low/medium/high)
}

Only respond with valid JSON, no additional text.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: publicUrl,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error("LLM API error:", errorText);
      return new Response(
        JSON.stringify({
          error: `LLM API error: ${llmResponse.status}`,
          publicUrl,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const llmData = await llmResponse.json();
    const analysisText = llmData.choices?.[0]?.message?.content || "";

    // Try to parse the JSON response from LLM
    let nutritionData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = analysisText.match(/```json\n?([\s\S]*?)\n?```/) ||
        analysisText.match(/```\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : analysisText;
      nutritionData = JSON.parse(jsonText.trim());
    } catch (parseError) {
      console.error("Failed to parse LLM response:", analysisText);
      nutritionData = {
        food_name: "Unknown",
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        weight: 0,
        confidence: "low",
        raw_response: analysisText,
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        publicUrl,
        filePath: fullPath,
        analysis: nutritionData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

