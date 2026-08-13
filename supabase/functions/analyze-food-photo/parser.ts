import type { FoodAnalysis } from "./types.ts";
import {
	createResponseAdapter,
	type LlmResponseAdapter,
	type LlmResponseAdapterName,
} from "./responseAdapter.ts";

const defaultAdapter: LlmResponseAdapter = createResponseAdapter("gemini");

/**
 * Парсит «сырой» текстовый ответ LLM через выбранный адаптер.
 * Сохранена прежняя сигнатура для обратной совместимости с index.ts.
 */
export function parseLLMResponse(
	responseText: string,
	adapter: LlmResponseAdapter = defaultAdapter,
): FoodAnalysis {
	return adapter.adapt(responseText);
}

export function validateConfidence(analysis: FoodAnalysis): boolean {
	return analysis.confidence !== "low";
}

export async function extractAnalysisFromResponse(
	llmResponse: Response,
	adapterName: LlmResponseAdapterName = "gemini",
): Promise<FoodAnalysis> {
	if (!llmResponse.ok) {
		const errorText = await llmResponse.text();
		console.error("LLM API error:", errorText);
		throw new Error(`LLM API error: ${llmResponse.status}`);
	}

	const llmData = await llmResponse.json();
	const analysisText = llmData.choices?.[0]?.message?.content || "";
	const adapter = createResponseAdapter(adapterName);
	return parseLLMResponse(analysisText, adapter);
}
