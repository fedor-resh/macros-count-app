import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
			},
		);

		// Get the current user
		const {
			data: { user },
			error: authError,
		} = await supabaseClient.auth.getUser();

		if (authError || !user) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		// Parse the multipart form data
		const formData = await req.formData();
		const file = formData.get("photo") as File;

		if (!file) {
			return new Response(JSON.stringify({ error: "No photo provided" }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		// Generate unique filename
		const fileExt = file.name.split(".").pop() || "jpg";
		const fileName = `photo-${Date.now()}.${fileExt}`;
		const fullPath = `${user.id}/${fileName}`;

		// Convert file to base64 for LLM
		const fileBuffer = await file.arrayBuffer();
		const base64Image = btoa(
			new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
		);
		const mimeType = file.type || "image/jpeg";
		const dataUrl = `data:${mimeType};base64,${base64Image}`;

		// Check API key before starting parallel operations
		const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
		if (!openRouterApiKey) {
			return new Response(JSON.stringify({ error: "OpenRouter API key not configured" }), {
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		const siteUrl = Deno.env.get("SITE_URL") || "https://macros-count-app.com";
		const siteName = Deno.env.get("SITE_NAME") || "Macros Count App";

		// Start both operations in parallel
		const [uploadResult, llmResponse] = await Promise.all([
			// Upload to Supabase Storage
			supabaseClient.storage
				.from("images")
				.upload(fullPath, fileBuffer, {
					contentType: file.type,
					cacheControl: "3600",
					upsert: false,
				}),
			// Send to OpenRouter LLM for analysis
			fetch("https://openrouter.ai/api/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${openRouterApiKey}`,
					"HTTP-Referer": siteUrl,
					"X-Title": siteName,
				},
				body: JSON.stringify({
					model: "google/gemini-2.5-flash-lite",
					messages: [
						{
							role: "user",
							content: [
								{
									type: "text",
									text: `Analyze this food image and provide nutritional information in JSON format with the following structure:
{
  "food_name": "краткое название продукта (на русском языке)",
  "calories"?: estimated calories (number), if not known, do not include it.
  "protein"?: estimated protein in grams (number), if not known, do not include it.
  "weight"?: estimated weight in grams (number), if not known, do not include it.
  "confidence": confidence level (low/medium/high)
}

Only respond with valid JSON, no additional text.`,
								},
								{
									type: "image_url",
									image_url: {
										url: dataUrl,
									},
								},
							],
						},
					],
				}),
			}),
		]);

		// Check upload result
		if (uploadResult.error) {
			console.error("Upload error:", uploadResult.error);
			return new Response(
				JSON.stringify({
					error: `Failed to upload: ${uploadResult.error.message}`,
				}),
				{
					status: 500,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		// Get public URL
		const {
			data: { publicUrl },
		} = supabaseClient.storage.from("images").getPublicUrl(fullPath);

		// Check LLM response
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
				},
			);
		}

		const llmData = await llmResponse.json();
		const analysisText = llmData.choices?.[0]?.message?.content || "";

		// Try to parse the JSON response from LLM
		let nutritionData: FoodAnalysis;
		try {
			// Extract JSON from markdown code blocks if present
			const jsonMatch =
				analysisText.match(/```json\n?([\s\S]*?)\n?```/) ||
				analysisText.match(/```\n?([\s\S]*?)\n?```/);
			const jsonText = jsonMatch ? jsonMatch[1] : analysisText;
			nutritionData = JSON.parse(jsonText.trim());
		} catch {
			console.error("Failed to parse LLM response:", analysisText);
			nutritionData = {
				food_name: "Unknown",
				calories: 0,
				protein: 0,
				weight: 0,
				confidence: "low",
				raw_response: analysisText,
			};
		}

		// Check confidence level - if low, return error
		if (nutritionData.confidence === "low") {
			return new Response(
				JSON.stringify({
					error: "Низкая точность анализа. Пожалуйста, попробуйте снова с более четким фото.",
					publicUrl,
					analysis: nutritionData,
				}),
				{
					status: 422,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		// Insert nutrition data into eaten_product table
		const today = new Date().toISOString().split("T")[0];

		const dataToInsert = {
			name: nutritionData.food_name || "Продукт",
			unit: "г",
			date: today,
			user_id: user.id,
			image_url: publicUrl,
		};

		if (nutritionData.calories) {
			dataToInsert.kcalories = Math.round(nutritionData.calories);
		}
		if (nutritionData.protein) {
			dataToInsert.protein = Math.round(nutritionData.protein);
		}
		if (nutritionData.weight) {
			dataToInsert.value = Math.round(nutritionData.weight);
		}

		console.log("dataToInsert", dataToInsert);

		const { data: insertedData } = await supabaseClient
			.from("eaten_product")
			.insert(dataToInsert)
			.select();

		return new Response(
			JSON.stringify({
				success: true,
				publicUrl,
				filePath: fullPath,
				analysis: nutritionData,
				insertedId: insertedData?.[0]?.id,
			}),
			{
				status: 200,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
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
			},
		);
	}
});
