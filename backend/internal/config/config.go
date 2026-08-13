package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Port               string
	DatabaseURL        string
	AutoMigrate        bool
	AuthJWTSecret      string
	GoogleClientID     string
	GoogleClientSecret string
	LLMBaseURL         string
	LLMAPIKey          string
	LLMModel           string
	SiteURL            string
	SiteName           string
	CORSAllowedOrigins []string
	DataDir            string
	PublicBaseURL      string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:               getEnv("PORT", "8080"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		AutoMigrate:        os.Getenv("AUTO_MIGRATE") == "true",
		AuthJWTSecret:      os.Getenv("AUTH_JWT_SECRET"),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		LLMBaseURL:         os.Getenv("LLM_BASE_URL"),
		LLMAPIKey:          os.Getenv("LLM_API_KEY"),
		LLMModel:           os.Getenv("LLM_MODEL"),
		SiteURL:            getEnv("SITE_URL", "https://bite.fedorresh.ru"),
		SiteName:           getEnv("SITE_NAME", "Bite"),
		DataDir:            getEnv("DATA_DIR", "/data"),
		PublicBaseURL:      strings.TrimRight(os.Getenv("PUBLIC_BASE_URL"), "/"),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.AuthJWTSecret == "" {
		return nil, fmt.Errorf("AUTH_JWT_SECRET is required")
	}
	if cfg.LLMAPIKey == "" {
		return nil, fmt.Errorf("LLM_API_KEY is required")
	}
	if cfg.PublicBaseURL == "" {
		return nil, fmt.Errorf("PUBLIC_BASE_URL is required")
	}
	if (cfg.GoogleClientID == "") != (cfg.GoogleClientSecret == "") {
		return nil, fmt.Errorf("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together")
	}

	if origins := os.Getenv("CORS_ALLOWED_ORIGINS"); origins != "" {
		for _, o := range strings.Split(origins, ",") {
			if trimmed := strings.TrimSpace(o); trimmed != "" {
				cfg.CORSAllowedOrigins = append(cfg.CORSAllowedOrigins, trimmed)
			}
		}
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
