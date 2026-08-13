package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"time"
)

const bucket = "images"

// Supabase uploads to the Supabase Storage REST API using the service role
// key (the Go API is trusted; per-user path isolation is enforced by the
// photo handler building the path from the authenticated user id).
type Supabase struct {
	baseURL        string
	serviceRoleKey string
	client         *http.Client
}

func NewSupabase(supabaseURL, serviceRoleKey string) *Supabase {
	return &Supabase{
		baseURL:        supabaseURL,
		serviceRoleKey: serviceRoleKey,
		client:         &http.Client{Timeout: 30 * time.Second},
	}
}

func (s *Supabase) Upload(ctx context.Context, path, contentType string, data []byte) (string, error) {
	url := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.baseURL, bucket, path)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+s.serviceRoleKey)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Cache-Control", "max-age=3600")
	req.Header.Set("x-upsert", "false")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("storage upload: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return "", fmt.Errorf("storage upload failed: %s: %s", resp.Status, body)
	}

	return fmt.Sprintf("%s/storage/v1/object/public/%s/%s", s.baseURL, bucket, path), nil
}
