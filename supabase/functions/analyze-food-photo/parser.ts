import type { FoodAnalysis } from "./types.ts";

export function parseLLMResponse(responseText: string): FoodAnalysis {
	try {
		// Extract JSON from markdown code blocks if present
		const jsonMatch =
			responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
			responseText.match(/```\n?([\s\S]*?)\n?```/);
		const jsonText = jsonMatch ? jsonMatch[1] : responseText;
		return JSON.parse(jsonText.trim());
	} catch (error) {
		console.error("Failed to parse LLM response:", responseText, error);
		return {
			food_name: "Unknown",
			calories: 0,
			protein: 0,
			weight: 0,
			confidence: "low",
			raw_response: responseText,
		};
	}
}

export function validateConfidence(analysis: FoodAnalysis): boolean {
	return analysis.confidence !== "low";
}

export async function extractAnalysisFromResponse(llmResponse: Response): Promise<FoodAnalysis> {
	if (!llmResponse.ok) {
		const errorText = await llmResponse.text();
		console.error("LLM API error:", errorText);
		throw new Error(`LLM API error: ${llmResponse.status}`);
	}

	const llmData = await llmResponse.json();
	const analysisText = llmData.choices?.[0]?.message?.content || "";
	return parseLLMResponse(analysisText);
}
