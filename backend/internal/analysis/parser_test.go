package analysis

import (
	"encoding/json"
	"testing"
)

func floatPtrEq(t *testing.T, name string, got *float64, want float64) {
	t.Helper()
	if got == nil {
		t.Fatalf("%s: expected %v, got nil", name, want)
	}
	if *got != want {
		t.Fatalf("%s: expected %v, got %v", name, want, *got)
	}
}

func TestAdaptGeminiResponse_PlainJSON(t *testing.T) {
	// TC-20: парсит чистый JSON-ответ
	raw := `{"food_name":"Яблоко","calories":52,"protein":0.3,"weight":150,"confidence":"high"}`
	result := AdaptGeminiResponse(raw)

	if result.FoodName != "Яблоко" {
		t.Fatalf("food_name: expected Яблоко, got %q", result.FoodName)
	}
	floatPtrEq(t, "calories", result.Calories, 52)
	floatPtrEq(t, "protein", result.Protein, 0.3)
	floatPtrEq(t, "weight", result.Weight, 150)
	if result.Confidence != "high" {
		t.Fatalf("confidence: expected high, got %q", result.Confidence)
	}
}

func TestAdaptGeminiResponse_JSONFence(t *testing.T) {
	// TC-21: парсит JSON в markdown-обёртке ```json ... ```
	raw := "```json\n{\"food_name\":\"Борщ\",\"calories\":250,\"confidence\":\"medium\"}\n```"
	result := AdaptGeminiResponse(raw)

	if result.FoodName != "Борщ" {
		t.Fatalf("food_name: expected Борщ, got %q", result.FoodName)
	}
	floatPtrEq(t, "calories", result.Calories, 250)
	if result.Confidence != "medium" {
		t.Fatalf("confidence: expected medium, got %q", result.Confidence)
	}
}

func TestAdaptGeminiResponse_PlainFence(t *testing.T) {
	// TC-22: парсит JSON в обычной markdown-обёртке ``` ... ```
	raw := "```\n{\"food_name\":\"Хлеб\",\"confidence\":\"low\"}\n```"
	result := AdaptGeminiResponse(raw)

	if result.FoodName != "Хлеб" {
		t.Fatalf("food_name: expected Хлеб, got %q", result.FoodName)
	}
	if result.Confidence != "low" {
		t.Fatalf("confidence: expected low, got %q", result.Confidence)
	}
}

func TestAdaptGeminiResponse_InvalidJSONFallback(t *testing.T) {
	// TC-23: на невалидном JSON возвращает fallback с confidence='low'
	raw := "Извините, я не могу распознать это блюдо"
	result := AdaptGeminiResponse(raw)

	if result.FoodName != "Unknown" {
		t.Fatalf("food_name: expected Unknown, got %q", result.FoodName)
	}
	if result.Confidence != "low" {
		t.Fatalf("confidence: expected low, got %q", result.Confidence)
	}
	if result.RawResponse != raw {
		t.Fatalf("raw_response: expected original text, got %q", result.RawResponse)
	}
}

func TestAdaptGeminiResponse_MissingNumbersOmitted(t *testing.T) {
	// TC-24: отсутствующие числовые поля не попадают в результат
	raw := `{"food_name":"Вода","confidence":"high"}`
	result := AdaptGeminiResponse(raw)

	if result.FoodName != "Вода" {
		t.Fatalf("food_name: expected Вода, got %q", result.FoodName)
	}
	if result.Calories != nil || result.Protein != nil || result.Weight != nil {
		t.Fatalf("expected nil numeric fields, got calories=%v protein=%v weight=%v",
			result.Calories, result.Protein, result.Weight)
	}

	// В JSON-сериализации поля тоже должны отсутствовать (omitempty).
	b, err := json.Marshal(result)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"calories", "protein", "weight"} {
		if _, present := m[key]; present {
			t.Fatalf("expected %q to be absent from serialized result", key)
		}
	}
}

func TestAdaptGeminiResponse_BadConfidenceNormalized(t *testing.T) {
	// TC-25: некорректное значение confidence нормализуется в 'low'
	raw := `{"food_name":"X","confidence":"супер-высокое"}`
	result := AdaptGeminiResponse(raw)

	if result.Confidence != "low" {
		t.Fatalf("confidence: expected low, got %q", result.Confidence)
	}
}

func TestAdaptGeminiResponse_NonNumericValuesIgnored(t *testing.T) {
	// Числовые поля со строковыми значениями игнорируются (typeof === "number").
	raw := `{"food_name":"Суп","calories":"много","confidence":"medium"}`
	result := AdaptGeminiResponse(raw)

	if result.Calories != nil {
		t.Fatalf("calories: expected nil for non-numeric value, got %v", *result.Calories)
	}
}

func TestExtractAnalysisFromResponse(t *testing.T) {
	// TC-27: извлекает content из choices[0].message.content
	body := `{"choices":[{"message":{"content":"{\"food_name\":\"Test\",\"confidence\":\"high\",\"calories\":100}"}}]}`
	result, err := ExtractAnalysisFromResponse([]byte(body))
	if err != nil {
		t.Fatal(err)
	}
	if result.FoodName != "Test" {
		t.Fatalf("food_name: expected Test, got %q", result.FoodName)
	}
	floatPtrEq(t, "calories", result.Calories, 100)
}

func TestExtractAnalysisFromResponse_EmptyChoices(t *testing.T) {
	result, err := ExtractAnalysisFromResponse([]byte(`{"choices":[]}`))
	if err != nil {
		t.Fatal(err)
	}
	if result.FoodName != "Unknown" || result.Confidence != "low" {
		t.Fatalf("expected fallback analysis, got %+v", result)
	}
}
