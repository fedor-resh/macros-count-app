package analysis

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
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

// Дефолты провайдера: любой OpenAI-совместимый шлюз подходит, меняются
// через LLM_BASE_URL и LLM_MODEL.
const (
	DefaultBaseURL = "https://api.provod.ai/v1"
	DefaultModel   = "google/gemini-3.1-flash-lite"
)

// Client говорит с любым OpenAI-совместимым чат-эндпоинтом (provod.ai,
// OpenRouter, сам OpenAI): различий в теле запроса для нашего сценария нет.
type Client struct {
	baseURL  string
	apiKey   string
	model    string
	siteURL  string
	siteName string
	client   *http.Client
}

func NewClient(baseURL, apiKey, model, siteURL, siteName string) *Client {
	if baseURL == "" {
		baseURL = DefaultBaseURL
	}
	if model == "" {
		model = DefaultModel
	}
	return &Client{
		baseURL:  strings.TrimRight(baseURL, "/"),
		apiKey:   apiKey,
		model:    model,
		siteURL:  siteURL,
		siteName: siteName,
		client:   &http.Client{Timeout: 90 * time.Second},
	}
}

func (c *Client) Analyze(ctx context.Context, imageURL string) (FoodAnalysis, error) {
	payload := map[string]any{
		// Модель задаётся строкой: список models для fallback понимает не
		// каждый шлюз (provod.ai отвечает на него 400).
		"model":      c.model,
		"max_tokens": 2048,
		// response_format: json_object намеренно не шлём: Gemini с ним
		// склонен заворачивать ответ в массив, а без него отдаёт объект,
		// который ждёт AdaptGeminiResponse.
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
		c.baseURL+"/chat/completions", bytes.NewReader(body))
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
		msg := string(respBody)
		if len(msg) > 500 {
			msg = msg[:500]
		}
		return FoodAnalysis{}, fmt.Errorf("LLM API error: %d: %s", resp.StatusCode, msg)
	}

	return ExtractAnalysisFromResponse(respBody)
}
