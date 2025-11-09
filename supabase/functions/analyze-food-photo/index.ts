import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
	createErrorResponse,
	createSuccessResponse,
	createLowConfidenceResponse,
} from "./responses.ts";
import { handleCorsPreflight } from "./cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "./auth.ts";
import { parseFormData, processFile } from "./file-handler.ts";
import { uploadImage, getPublicUrl } from "./storage.ts";
import { analyzeFoodImage } from "./llm.ts";
import { extractAnalysisFromResponse, validateConfidence } from "./parser.ts";
import { prepareEatenProductData, insertEatenProduct } from "./database.ts";
import type { FoodAnalysis } from "./types.ts";

serve(async (req) => {
	// Handle CORS preflight requests
	if (req.method === "OPTIONS") {
		return handleCorsPreflight();
	}

	// Initialize Supabase client and authenticate user
	const supabaseClient = createSupabaseClient(req.headers.get("Authorization"));
	const { user, error: authError } = await getAuthenticatedUser(supabaseClient);

	if (authError || !user) {
		return createErrorResponse("Unauthorized", 401);
	}

	// Parse and process file
	const { file, date } = await parseFormData(req);
	const fileInfo = await processFile(user.id, file);

	// Start both operations in parallel
	const [uploadResult, llmResponse] = await Promise.all([
		uploadImage(supabaseClient, fileInfo.fullPath, fileInfo.buffer, file.type),
		analyzeFoodImage(fileInfo.dataUrl),
	]);

	// Check upload result
	if (uploadResult.error) {
		console.error("Upload error:", uploadResult.error);
		return createErrorResponse(uploadResult.error.message, 500);
	}

	// Get public URL
	const publicUrl = getPublicUrl(supabaseClient, fileInfo.fullPath);

	// Extract and parse LLM analysis
	let nutritionData: FoodAnalysis;
	try {
		nutritionData = await extractAnalysisFromResponse(llmResponse);
	} catch (error) {
		console.error("LLM error:", error);
		return createErrorResponse(
			error instanceof Error ? error.message : "LLM API error",
			500,
			publicUrl,
		);
	}

	// Validate confidence level
	console.log("Validating confidence level", nutritionData);
	if (!validateConfidence(nutritionData)) {
		return createLowConfidenceResponse(publicUrl, nutritionData);
	}

	// Insert nutrition data into database
	const dataToInsert = prepareEatenProductData(nutritionData, user.id, publicUrl, date);

	const { id: insertedId } = await insertEatenProduct(supabaseClient, dataToInsert);

	return createSuccessResponse(publicUrl, fileInfo.fullPath, nutritionData, insertedId);
});
