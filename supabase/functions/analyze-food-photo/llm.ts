import { createLlmProvider, type LlmProvider, type LlmProviderName } from "./llmProvider.ts";

/**
 * Тонкая обвязка над фабрикой LLM-провайдеров (Factory Method).
 * По умолчанию используется OpenRouter; провайдера можно подменить
 * без изменения вызывающего кода.
 */
export async function analyzeFoodImage(
	imageUrl: string,
	providerName: LlmProviderName = "openrouter",
): Promise<Response> {
	const provider: LlmProvider = createLlmProvider(providerName);
	return provider.analyze(imageUrl);
}

export { createLlmProvider };
export type { LlmProvider, LlmProviderName };
