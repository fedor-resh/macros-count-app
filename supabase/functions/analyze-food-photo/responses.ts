import { createCorsResponse } from "./cors.ts";
import type { AnalysisResponse, ErrorResponse, FoodAnalysis } from "./types.ts";

export function createSuccessResponse(
	publicUrl: string,
	filePath: string,
	analysis: FoodAnalysis,
	insertedId?: number,
): Response {
	const response: AnalysisResponse = {
		success: true,
		publicUrl,
		filePath,
		analysis,
		insertedId,
	};
	return createCorsResponse(JSON.stringify(response), 200);
}

export function createErrorResponse(
	error: string,
	status = 500,
	publicUrl?: string,
	analysis?: FoodAnalysis,
): Response {
	const response: ErrorResponse = { error };
	if (publicUrl) response.publicUrl = publicUrl;
	if (analysis) response.analysis = analysis;
	return createCorsResponse(JSON.stringify(response), status);
}

export function createUnauthorizedResponse(): Response {
	return createErrorResponse("Unauthorized", 401);
}

export function createLowConfidenceResponse(publicUrl: string, analysis: FoodAnalysis): Response {
	return createErrorResponse(
		"Низкая точность анализа. Пожалуйста, попробуйте снова с более четким фото.",
		422,
		publicUrl,
		analysis,
	);
}
