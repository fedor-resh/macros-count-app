package config

import "testing"

func setRequiredEnv(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgresql://localhost/test")
	t.Setenv("OPENROUTER_API_KEY", "key")
	t.Setenv("AUTH_JWT_SECRET", "test-secret-at-least-32-characters-long")
	t.Setenv("PUBLIC_BASE_URL", "https://example.com/")
	t.Setenv("AUTO_MIGRATE", "")
	t.Setenv("GOOGLE_CLIENT_ID", "")
	t.Setenv("GOOGLE_CLIENT_SECRET", "")
	t.Setenv("CORS_ALLOWED_ORIGINS", "")
}

func TestLoad_RequiresAuthSecretAndPublicBaseURL(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("AUTH_JWT_SECRET", "")
	if _, err := Load(); err == nil {
		t.Fatal("expected error without AUTH_JWT_SECRET")
	}

	setRequiredEnv(t)
	t.Setenv("PUBLIC_BASE_URL", "")
	if _, err := Load(); err == nil {
		t.Fatal("expected error without PUBLIC_BASE_URL")
	}

	setRequiredEnv(t)
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.PublicBaseURL != "https://example.com" {
		t.Fatalf("unexpected PublicBaseURL %q", cfg.PublicBaseURL)
	}
	if cfg.DataDir != "/data" {
		t.Fatalf("unexpected default DataDir %q", cfg.DataDir)
	}
}

func TestLoad_GoogleKeysMustBePaired(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("GOOGLE_CLIENT_ID", "id")
	if _, err := Load(); err == nil {
		t.Fatal("expected error when only GOOGLE_CLIENT_ID is set")
	}

	t.Setenv("GOOGLE_CLIENT_SECRET", "secret")
	if _, err := Load(); err != nil {
		t.Fatal(err)
	}
}

func TestLoad_AutoMigrateFlag(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("AUTO_MIGRATE", "true")

	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if !cfg.AutoMigrate {
		t.Fatal("expected AutoMigrate=true")
	}
}
