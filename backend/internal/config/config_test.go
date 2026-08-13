package config

import "testing"

func setRequiredEnv(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgresql://localhost/test")
	t.Setenv("SUPABASE_URL", "https://test.supabase.co")
	t.Setenv("OPENROUTER_API_KEY", "key")
	t.Setenv("SUPABASE_SERVICE_ROLE_KEY", "")
	t.Setenv("STORAGE_DRIVER", "")
	t.Setenv("PUBLIC_BASE_URL", "")
	t.Setenv("AUTO_MIGRATE", "")
}

func TestLoad_SupabaseDriverRequiresServiceRoleKey(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("STORAGE_DRIVER", "supabase")

	if _, err := Load(); err == nil {
		t.Fatal("expected error without SUPABASE_SERVICE_ROLE_KEY")
	}

	t.Setenv("SUPABASE_SERVICE_ROLE_KEY", "sr-key")
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.StorageDriver != StorageDriverSupabase {
		t.Fatalf("unexpected driver %q", cfg.StorageDriver)
	}
}

func TestLoad_DiskDriverRequiresPublicBaseURL(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("STORAGE_DRIVER", "disk")

	if _, err := Load(); err == nil {
		t.Fatal("expected error without PUBLIC_BASE_URL")
	}

	t.Setenv("PUBLIC_BASE_URL", "https://example.com/")
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	// Disk-драйвер не требует service role key, а слэш в базовом URL срезается.
	if cfg.PublicBaseURL != "https://example.com" {
		t.Fatalf("unexpected PublicBaseURL %q", cfg.PublicBaseURL)
	}
	if cfg.DataDir != "/data" {
		t.Fatalf("unexpected default DataDir %q", cfg.DataDir)
	}
}

func TestLoad_UnknownDriverRejected(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("STORAGE_DRIVER", "s3")

	if _, err := Load(); err == nil {
		t.Fatal("expected error for unknown storage driver")
	}
}

func TestLoad_AutoMigrateFlag(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("SUPABASE_SERVICE_ROLE_KEY", "sr-key")
	t.Setenv("AUTO_MIGRATE", "true")

	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if !cfg.AutoMigrate {
		t.Fatal("expected AutoMigrate=true")
	}
}
