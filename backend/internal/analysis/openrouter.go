package analysis

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// Prompt is the LLM_PROMPT from the edge function, unchanged.
const Prompt = `Analyze this food image and provide nutritional information in JSON format with the following structure:
{
  "food_name": "краткое название продукта (на русском языке)",
  "calories"?: estimated calories (number), if not known, do not include it.
  "protein"?: estimated protein in grams (number), if not known, do not include it.
  "weight"?: estimated weight in grams (number), if not known, do not include it.
  "confidence": confidence level (low/medium/high)
}

Only respond with valid JSON, no additional text.`

const defaultModel = "google/gemini-3-flash-preview"

type OpenRouterClient struct {
	apiKey   string
	siteURL  string
	siteName string
	model    string
	client   *http.Client
}

func NewOpenRouterClient(apiKey, siteURL, siteName string) *OpenRouterClient {
	return &OpenRouterClient{
		apiKey:   apiKey,
		siteURL:  siteURL,
		siteName: siteName,
		model:    defaultModel,
		client:   &http.Client{},
	}
}

func (c *OpenRouterClient) Analyze(ctx context.Context, imageURL string) (FoodAnalysis, error) {
	payload := map[string]any{
		"model": c.model,
		"messages": []map[string]any{
			{
				"role": "user",
				"content": []map[string]any{
					{"type": "text", "text": Prompt},
					{"type": "image_url", "image_url": map[string]string{"url": imageURL}},
				},
			},
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return FoodAnalysis{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://openrouter.ai/api/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return FoodAnalysis{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("HTTP-Referer", c.siteURL)
	req.Header.Set("X-Title", c.siteName)

	resp, err := c.client.Do(req)
	if err != nil {
		return FoodAnalysis{}, fmt.Errorf("LLM request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return FoodAnalysis{}, fmt.Errorf("read LLM response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return FoodAnalysis{}, fmt.Errorf("LLM API error: %d: %s", resp.StatusCode, respBody)
	}

	return ExtractAnalysisFromResponse(respBody)
}
