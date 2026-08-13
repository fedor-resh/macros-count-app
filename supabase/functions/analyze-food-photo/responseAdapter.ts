import type { FoodAnalysis } from "./types.ts";

/**
 * Паттерн Adapter: приводит «сырой» текстовый ответ LLM
 * (любой формат: чистый JSON, markdown-обёртка, c комментариями)
 * к единой доменной структуре FoodAnalysis.
 */
export interface LlmResponseAdapter {
	readonly name: string;
	adapt(rawText: string): FoodAnalysis;
}

const FALLBACK_ANALYSIS = (rawText: string): FoodAnalysis => ({
	food_name: "Unknown",
	calories: 0,
	protein: 0,
	weight: 0,
	confidence: "low",
	raw_response: rawText,
});

function extractJsonFromMarkdown(text: string): string {
	const fencedJson = text.match(/```json\n?([\s\S]*?)\n?```/);
	if (fencedJson) {
		return fencedJson[1];
	}
	const fenced = text.match(/```\n?([\s\S]*?)\n?```/);
	if (fenced) {
		return fenced[1];
	}
	return text;
}

function normalizeConfidence(value: unknown): FoodAnalysis["confidence"] {
	if (value === "high" || value === "medium" || value === "low") {
		return value;
	}
	return "low";
}

/**
 * Адаптер ответа Google Gemini (через OpenRouter).
 * Gemini часто оборачивает JSON в markdown-блок ```json ... ```.
 */
export class GeminiResponseAdapter implements LlmResponseAdapter {
	readonly name = "gemini";

	adapt(rawText: string): FoodAnalysis {
		try {
			const jsonText = extractJsonFromMarkdown(rawText).trim();
			const parsed = JSON.parse(jsonText) as Partial<FoodAnalysis> & Record<string, unknown>;

			const result: FoodAnalysis = {
				food_name: typeof parsed.food_name === "string" ? parsed.food_name : "Unknown",
				confidence: normalizeConfidence(parsed.confidence),
			};

			if (typeof parsed.calories === "number") result.calories = parsed.calories;
			if (typeof parsed.protein === "number") result.protein = parsed.protein;
			if (typeof parsed.weight === "number") result.weight = parsed.weight;

			return result;
		} catch (error) {
			console.error("GeminiResponseAdapter: failed to parse response:", rawText, error);
			return FALLBACK_ANALYSIS(rawText);
		}
	}
}

export type LlmResponseAdapterName = "gemini";

export function createResponseAdapter(name: LlmResponseAdapterName = "gemini"): LlmResponseAdapter {
	switch (name) {
		case "gemini":
			return new GeminiResponseAdapter();
		default: {
			const _exhaustive: never = name;
			throw new Error(`Unknown response adapter: ${_exhaustive}`);
		}
	}
}
