package analysis

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClient_Analyze(t *testing.T) {
	var gotPath string
	var gotAuth string
	var gotPayload map[string]any

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotAuth = r.Header.Get("Authorization")
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &gotPayload)
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"choices":[{"message":{"content":"{\"food_name\":\"Огурец\",\"calories\":41,\"confidence\":\"high\"}"}}]}`)
	}))
	defer srv.Close()

	c := NewClient(srv.URL+"/v1/", "test-key", "vendor/model", "https://bite.example", "Bite")
	result, err := c.Analyze(context.Background(), "data:image/jpeg;base64,AAAA")
	if err != nil {
		t.Fatal(err)
	}

	if gotPath != "/v1/chat/completions" {
		t.Fatalf("unexpected path %q", gotPath)
	}
	if gotAuth != "Bearer test-key" {
		t.Fatalf("unexpected authorization %q", gotAuth)
	}
	// Шлюзы ждут model строкой; список models раньше приводил к 400.
	if model, _ := gotPayload["model"].(string); model != "vendor/model" {
		t.Fatalf("expected model string in payload, got %v", gotPayload["model"])
	}
	if _, present := gotPayload["models"]; present {
		t.Fatal("payload must not carry a models list")
	}
	if result.FoodName != "Огурец" {
		t.Fatalf("food_name: expected Огурец, got %q", result.FoodName)
	}
}

func TestClient_AnalyzeAPIError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		io.WriteString(w, `{"error":"invalid key"}`)
	}))
	defer srv.Close()

	c := NewClient(srv.URL, "bad-key", "", "", "")
	if _, err := c.Analyze(context.Background(), "data:image/jpeg;base64,AAAA"); err == nil {
		t.Fatal("expected error on non-200 response")
	}
}

func TestNewClient_Defaults(t *testing.T) {
	c := NewClient("", "key", "", "", "")
	if c.baseURL != DefaultBaseURL {
		t.Fatalf("unexpected base URL %q", c.baseURL)
	}
	if c.model != DefaultModel {
		t.Fatalf("unexpected model %q", c.model)
	}
}
