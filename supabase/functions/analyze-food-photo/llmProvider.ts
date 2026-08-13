import { getOpenRouterApiKey, getSiteUrl, getSiteName } from "./config.ts";

export const LLM_PROMPT = `Analyze this food image and provide nutritional information in JSON format with the following structure:
{
  "food_name": "краткое название продукта (на русском языке)",
  "calories"?: estimated calories (number), if not known, do not include it.
  "protein"?: estimated protein in grams (number), if not known, do not include it.
  "weight"?: estimated weight in grams (number), if not known, do not include it.
  "confidence": confidence level (low/medium/high)
}

Only respond with valid JSON, no additional text.`;

/**
 * Паттерн Factory Method: интерфейс продукта.
 * Каждый конкретный провайдер инкапсулирует свой транспорт (URL, заголовки, тело)
 * и возвращает «сырой» Response, который дальше нормализует адаптер (Adapter).
 */
export interface LlmProvider {
	readonly name: string;
	analyze(imageUrl: string): Promise<Response>;
}

export class OpenRouterProvider implements LlmProvider {
	readonly name = "openrouter";

	constructor(private readonly model: string = "google/gemini-3-flash") {}

	analyze(imageUrl: string): Promise<Response> {
		const apiKey = getOpenRouterApiKey();
		const siteUrl = getSiteUrl();
		const siteName = getSiteName();

		return fetch("https://openrouter.ai/api/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
				"HTTP-Referer": siteUrl,
				"X-Title": siteName,
			},
			body: JSON.stringify({
				model: this.model,
				messages: [
					{
						role: "user",
						content: [
							{ type: "text", text: LLM_PROMPT },
							{ type: "image_url", image_url: { url: imageUrl } },
						],
					},
				],
			}),
		});
	}
}

export type LlmProviderName = "openrouter";

/**
 * Фабричный метод. Точка расширения — добавление новой модели/провайдера
 * не требует правок в index.ts.
 */
export function createLlmProvider(name: LlmProviderName = "openrouter"): LlmProvider {
	switch (name) {
		case "openrouter":
			return new OpenRouterProvider();
		default: {
			const _exhaustive: never = name;
			throw new Error(`Unknown LLM provider: ${_exhaustive}`);
		}
	}
}
