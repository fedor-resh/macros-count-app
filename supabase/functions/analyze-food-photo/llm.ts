import { getOpenRouterApiKey, getSiteUrl, getSiteName } from "./config.ts";

const LLM_PROMPT = `Analyze this food image and provide nutritional information in JSON format with the following structure:
{
  "food_name": "краткое название продукта (на русском языке)",
  "calories"?: estimated calories (number), if not known, do not include it.
  "protein"?: estimated protein in grams (number), if not known, do not include it.
  "weight"?: estimated weight in grams (number), if not known, do not include it.
  "confidence": confidence level (low/medium/high)
}

Only respond with valid JSON, no additional text.`;

export async function analyzeFoodImage(dataUrl: string): Promise<Response> {
	const openRouterApiKey = getOpenRouterApiKey();
	const siteUrl = getSiteUrl();
	const siteName = getSiteName();

	return fetch("https://openrouter.ai/api/v1/chat/completions", {
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
							text: LLM_PROMPT,
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
	});
}
