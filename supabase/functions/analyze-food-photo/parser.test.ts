import { describe, expect, it } from "vitest";
import { parseLLMResponse } from "./parser.ts";
import {
	createResponseAdapter,
	GeminiResponseAdapter,
	type LlmResponseAdapter,
} from "./responseAdapter.ts";

describe("GeminiResponseAdapter (Adapter pattern)", () => {
	const adapter: LlmResponseAdapter = new GeminiResponseAdapter();

	it("TC-20: парсит чистый JSON-ответ", () => {
		const raw = `{"food_name":"Яблоко","calories":52,"protein":0.3,"weight":150,"confidence":"high"}`;
		const result = adapter.adapt(raw);
		expect(result).toEqual({
			food_name: "Яблоко",
			calories: 52,
			protein: 0.3,
			weight: 150,
			confidence: "high",
		});
	});

	it("TC-21: парсит JSON в markdown-обёртке ```json ... ```", () => {
		const raw = '```json\n{"food_name":"Борщ","calories":250,"confidence":"medium"}\n```';
		const result = adapter.adapt(raw);
		expect(result.food_name).toBe("Борщ");
		expect(result.calories).toBe(250);
		expect(result.confidence).toBe("medium");
	});

	it("TC-22: парсит JSON в обычной markdown-обёртке ``` ... ```", () => {
		const raw = '```\n{"food_name":"Хлеб","confidence":"low"}\n```';
		const result = adapter.adapt(raw);
		expect(result.food_name).toBe("Хлеб");
		expect(result.confidence).toBe("low");
	});

	it("TC-23: на невалидном JSON возвращает fallback с confidence='low'", () => {
		const raw = "Извините, я не могу распознать это блюдо";
		const result = adapter.adapt(raw);
		expect(result.food_name).toBe("Unknown");
		expect(result.confidence).toBe("low");
		expect(result.raw_response).toBe(raw);
	});

	it("TC-24: отсутствующие числовые поля не попадают в результат", () => {
		const raw = `{"food_name":"Вода","confidence":"high"}`;
		const result = adapter.adapt(raw);
		expect(result.food_name).toBe("Вода");
		expect(result.confidence).toBe("high");
		expect(result).not.toHaveProperty("calories");
		expect(result).not.toHaveProperty("protein");
		expect(result).not.toHaveProperty("weight");
	});

	it("TC-25: некорректное значение confidence нормализуется в 'low'", () => {
		const raw = `{"food_name":"X","confidence":"супер-высокое"}`;
		const result = adapter.adapt(raw);
		expect(result.confidence).toBe("low");
	});
});

describe("createResponseAdapter (Factory)", () => {
	it("TC-26: создаёт GeminiResponseAdapter по имени 'gemini'", () => {
		const adapter = createResponseAdapter("gemini");
		expect(adapter.name).toBe("gemini");
		expect(adapter).toBeInstanceOf(GeminiResponseAdapter);
	});
});

describe("parseLLMResponse (обратная совместимость)", () => {
	it("TC-27: использует Gemini-адаптер по умолчанию", () => {
		const result = parseLLMResponse(`{"food_name":"Test","confidence":"high","calories":100}`);
		expect(result.food_name).toBe("Test");
		expect(result.calories).toBe(100);
	});
});
