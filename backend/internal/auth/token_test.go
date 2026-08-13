package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	testSecret = "super-secret-jwt-token-with-at-least-32-characters"
	testIssuer = "https://bite.example.com"
	testUserID = "6f9619ff-8b86-d011-b42d-00cf4fc964ff"
)

func newTestTokens(t *testing.T) *Tokens {
	t.Helper()
	tok, err := NewTokens(testSecret, testIssuer)
	if err != nil {
		t.Fatal(err)
	}
	return tok
}

func TestIssueAndVerify(t *testing.T) {
	tok := newTestTokens(t)
	signed, err := tok.Issue(testUserID)
	if err != nil {
		t.Fatal(err)
	}
	sub, err := tok.Verify(signed)
	if err != nil {
		t.Fatal(err)
	}
	if sub != testUserID {
		t.Fatalf("expected %q, got %q", testUserID, sub)
	}
}

func TestVerify_Expired(t *testing.T) {
	tok := newTestTokens(t)
	claims := jwt.MapClaims{
		"sub": testUserID,
		"iss": testIssuer,
		"aud": audience,
		"exp": time.Now().Add(-time.Hour).Unix(),
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(testSecret))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := tok.Verify(signed); err == nil {
		t.Fatal("expected error for expired token")
	}
}

func TestVerify_WrongIssuer(t *testing.T) {
	tok := newTestTokens(t)
	claims := jwt.MapClaims{
		"sub": testUserID,
		"iss": "https://evil.example.com",
		"aud": audience,
		"exp": time.Now().Add(time.Hour).Unix(),
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(testSecret))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := tok.Verify(signed); err == nil {
		t.Fatal("expected error for wrong issuer")
	}
}

func TestVerify_WrongSecret(t *testing.T) {
	tok := newTestTokens(t)
	other, err := NewTokens("another-secret-that-is-also-long-enough", testIssuer)
	if err != nil {
		t.Fatal(err)
	}
	signed, err := other.Issue(testUserID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := tok.Verify(signed); err == nil {
		t.Fatal("expected error for token signed with a different secret")
	}
}

func TestNewTokens_RequiresSecretAndIssuer(t *testing.T) {
	if _, err := NewTokens("", testIssuer); err == nil {
		t.Fatal("expected error without secret")
	}
	if _, err := NewTokens(testSecret, ""); err == nil {
		t.Fatal("expected error without issuer")
	}
}
