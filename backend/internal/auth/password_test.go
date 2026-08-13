package auth

import "testing"

func TestHashAndCheckPassword(t *testing.T) {
	hash, err := HashPassword("secret1")
	if err != nil {
		t.Fatal(err)
	}
	if err := CheckPassword(hash, "secret1"); err != nil {
		t.Fatal(err)
	}
	if err := CheckPassword(hash, "wrong-password"); err == nil {
		t.Fatal("expected mismatch")
	}
}

func TestHashPassword_TooShort(t *testing.T) {
	if _, err := HashPassword("12345"); err == nil {
		t.Fatal("expected error for short password")
	}
}

func TestCheckPassword_GoTrueHash(t *testing.T) {
	// bcrypt cost 10, password "secret1" — same scheme GoTrue used.
	hash, err := HashPassword("secret1")
	if err != nil {
		t.Fatal(err)
	}
	if hash[:4] != "$2a$" && hash[:4] != "$2b$" {
		t.Fatalf("expected bcrypt prefix, got %q", hash[:4])
	}
	if err := CheckPassword(hash, "secret1"); err != nil {
		t.Fatal(err)
	}
}

func TestCheckPassword_EmptyHash(t *testing.T) {
	if err := CheckPassword("", "secret1"); err == nil {
		t.Fatal("expected error for empty hash (Google-only account)")
	}
}
