package analysis

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

// FoodAnalysis mirrors the FoodAnalysis type of the edge function: optional
// numeric fields are pointers so "absent" stays distinguishable from zero.
type FoodAnalysis struct {
	FoodName    string   `json:"food_name"`
	Calories    *float64 `json:"calories,omitempty"`
	Protein     *float64 `json:"protein,omitempty"`
	Weight      *float64 `json:"weight,omitempty"`
	Confidence  string   `json:"confidence"`
	RawResponse string   `json:"raw_response,omitempty"`
}

var (
	fencedJSONRe = regexp.MustCompile("```json\n?([\\s\\S]*?)\n?```")
	fencedRe     = regexp.MustCompile("```\n?([\\s\\S]*?)\n?```")
)

// extractJSONFromMarkdown ports extractJsonFromMarkdown: Gemini often wraps
// the JSON payload in a markdown code fence.
func extractJSONFromMarkdown(text string) string {
	if m := fencedJSONRe.FindStringSubmatch(text); m != nil {
		return m[1]
	}
	if m := fencedRe.FindStringSubmatch(text); m != nil {
		return m[1]
	}
	return text
}

func normalizeConfidence(v any) string {
	if s, ok := v.(string); ok && (s == "high" || s == "medium" || s == "low") {
		return s
	}
	return "low"
}

func fallbackAnalysis(rawText string) FoodAnalysis {
	zero := 0.0
	return FoodAnalysis{
		FoodName:    "Unknown",
		Calories:    &zero,
		Protein:     &zero,
		Weight:      &zero,
		Confidence:  "low",
		RawResponse: rawText,
	}
}

// AdaptGeminiResponse ports GeminiResponseAdapter.adapt: tolerant parse of the
// raw LLM text, falling back to a low-confidence stub on invalid JSON.
func AdaptGeminiResponse(rawText string) FoodAnalysis {
	jsonText := extractJSONFromMarkdown(rawText)
	var parsed map[string]any
	if err := json.Unmarshal([]byte(jsonText), &parsed); err != nil {
		return fallbackAnalysis(rawText)
	}

	result := FoodAnalysis{
		FoodName:   "Unknown",
		Confidence: normalizeConfidence(parsed["confidence"]),
	}
	if name, ok := parsed["food_name"].(string); ok {
		result.FoodName = name
	}
	if v, ok := parsed["calories"].(float64); ok {
		result.Calories = &v
	}
	if v, ok := parsed["protein"].(float64); ok {
		result.Protein = &v
	}
	if v, ok := parsed["weight"].(float64); ok {
		result.Weight = &v
	}
	return result
}

type chatCompletionResponse struct {
	Choices []struct {
		Message struct {
			// Gemini 3 / новые провайдеры отдают либо строку, либо массив
			// частей [{"type":"text","text":"..."}]. json.RawMessage, чтобы
			// не падать на unmarshal array → string (это помечало каждый
			// успешный ответ как ошибку анализа).
			Content   json.RawMessage `json:"content"`
			Reasoning string          `json:"reasoning"`
		} `json:"message"`
	} `json:"choices"`
}

func messageText(raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" {
		return ""
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return s
	}
	var parts []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	}
	if err := json.Unmarshal(raw, &parts); err == nil {
		var b strings.Builder
		for _, p := range parts {
			if p.Type == "text" || p.Type == "" {
				b.WriteString(p.Text)
			}
		}
		return b.String()
	}
	return ""
}

// ExtractAnalysisFromResponse ports extractAnalysisFromResponse: pulls
// choices[0].message.content out of an OpenRouter chat completion body and
// adapts it.
func ExtractAnalysisFromResponse(body []byte) (FoodAnalysis, error) {
	var data chatCompletionResponse
	if err := json.Unmarshal(body, &data); err != nil {
		return FoodAnalysis{}, fmt.Errorf("parse LLM response body: %w", err)
	}
	content := ""
	if len(data.Choices) > 0 {
		content = messageText(data.Choices[0].Message.Content)
		if content == "" {
			content = data.Choices[0].Message.Reasoning
		}
	}
	return AdaptGeminiResponse(content), nil
}
