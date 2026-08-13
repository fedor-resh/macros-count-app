package config

import (
	"fmt"
	"os"
	"strings"
)

const (
	StorageDriverSupabase = "supabase"
	StorageDriverDisk     = "disk"
)

type Config struct {
	Port                   string
	DatabaseURL            string
	AutoMigrate            bool
	SupabaseURL            string
	SupabaseJWTSecret      string
	SupabaseServiceRoleKey string
	AuthJWKSURL            string
	OpenRouterAPIKey       string
	SiteURL                string
	SiteName               string
	CORSAllowedOrigins     []string

	// Storage: "supabase" (Фаза 1) или "disk" (Фаза 3).
	StorageDriver string
	DataDir       string
	PublicBaseURL string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:                   getEnv("PORT", "8080"),
		DatabaseURL:            os.Getenv("DATABASE_URL"),
		AutoMigrate:            os.Getenv("AUTO_MIGRATE") == "true",
		SupabaseURL:            strings.TrimRight(os.Getenv("SUPABASE_URL"), "/"),
		SupabaseJWTSecret:      os.Getenv("SUPABASE_JWT_SECRET"),
		SupabaseServiceRoleKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		OpenRouterAPIKey:       os.Getenv("OPENROUTER_API_KEY"),
		SiteURL:                getEnv("SITE_URL", "https://macros-count-app.com"),
		SiteName:               getEnv("SITE_NAME", "Bite"),
		StorageDriver:          getEnv("STORAGE_DRIVER", StorageDriverSupabase),
		DataDir:                getEnv("DATA_DIR", "/data"),
		PublicBaseURL:          strings.TrimRight(os.Getenv("PUBLIC_BASE_URL"), "/"),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.SupabaseURL == "" {
		return nil, fmt.Errorf("SUPABASE_URL is required")
	}
	if cfg.OpenRouterAPIKey == "" {
		return nil, fmt.Errorf("OPENROUTER_API_KEY is required")
	}

	switch cfg.StorageDriver {
	case StorageDriverSupabase:
		if cfg.SupabaseServiceRoleKey == "" {
			return nil, fmt.Errorf("SUPABASE_SERVICE_ROLE_KEY is required for STORAGE_DRIVER=supabase")
		}
	case StorageDriverDisk:
		if cfg.PublicBaseURL == "" {
			return nil, fmt.Errorf("PUBLIC_BASE_URL is required for STORAGE_DRIVER=disk")
		}
	default:
		return nil, fmt.Errorf("unknown STORAGE_DRIVER %q (expected %q or %q)",
			cfg.StorageDriver, StorageDriverSupabase, StorageDriverDisk)
	}

	cfg.AuthJWKSURL = getEnv("AUTH_JWKS_URL", cfg.SupabaseURL+"/auth/v1/.well-known/jwks.json")

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
