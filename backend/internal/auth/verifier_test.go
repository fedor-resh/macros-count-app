package auth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	testSupabaseURL = "https://test.supabase.co"
	testSecret      = "super-secret-jwt-token-with-at-least-32-characters"
	testUserID      = "6f9619ff-8b86-d011-b42d-00cf4fc964ff"
)

func hs256Token(t *testing.T, claims jwt.MapClaims) string {
	t.Helper()
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(testSecret))
	if err != nil {
		t.Fatal(err)
	}
	return token
}

func validClaims() jwt.MapClaims {
	return jwt.MapClaims{
		"sub": testUserID,
		"aud": "authenticated",
		"iss": testSupabaseURL + "/auth/v1",
		"exp": time.Now().Add(time.Hour).Unix(),
	}
}

func newHS256Verifier(t *testing.T) *Verifier {
	t.Helper()
	v, err := NewVerifier(context.Background(), testSupabaseURL, "", testSecret)
	if err != nil {
		t.Fatal(err)
	}
	return v
}

func TestVerify_HS256Valid(t *testing.T) {
	v := newHS256Verifier(t)
	sub, err := v.Verify(hs256Token(t, validClaims()))
	if err != nil {
		t.Fatalf("expected valid token, got error: %v", err)
	}
	if sub != testUserID {
		t.Fatalf("expected sub %q, got %q", testUserID, sub)
	}
}

func TestVerify_Expired(t *testing.T) {
	v := newHS256Verifier(t)
	claims := validClaims()
	claims["exp"] = time.Now().Add(-time.Hour).Unix()
	if _, err := v.Verify(hs256Token(t, claims)); err == nil {
		t.Fatal("expected error for expired token")
	}
}

func TestVerify_WrongAudience(t *testing.T) {
	v := newHS256Verifier(t)
	claims := validClaims()
	claims["aud"] = "anon"
	if _, err := v.Verify(hs256Token(t, claims)); err == nil {
		t.Fatal("expected error for wrong audience")
	}
}

func TestVerify_WrongIssuer(t *testing.T) {
	v := newHS256Verifier(t)
	claims := validClaims()
	claims["iss"] = "https://evil.example.com/auth/v1"
	if _, err := v.Verify(hs256Token(t, claims)); err == nil {
		t.Fatal("expected error for wrong issuer")
	}
}

func TestVerify_WrongSecret(t *testing.T) {
	v := newHS256Verifier(t)
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, validClaims()).SignedString([]byte("another-secret"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := v.Verify(token); err == nil {
		t.Fatal("expected error for token signed with a different secret")
	}
}

func TestVerify_MissingSubject(t *testing.T) {
	v := newHS256Verifier(t)
	claims := validClaims()
	delete(claims, "sub")
	if _, err := v.Verify(hs256Token(t, claims)); err == nil {
		t.Fatal("expected error for token without sub")
	}
}

func TestNewVerifier_EmptyJWKSWithoutSecretFails(t *testing.T) {
	// Проект без RS256-ключей (JWKS отвечает {"keys":[]}, обычный ответ для
	// legacy HS256-подписи) и без SUPABASE_JWT_SECRET не должен молча стартовать:
	// иначе он никогда не сможет провалидировать ни один токен.
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []any{}})
	}))
	defer server.Close()

	if _, err := NewVerifier(context.Background(), testSupabaseURL, server.URL, ""); err == nil {
		t.Fatal("expected NewVerifier to fail fast when JWKS has no keys and no HS256 secret is configured")
	}
}

func TestNewVerifier_EmptyJWKSFallsBackToSecret(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []any{}})
	}))
	defer server.Close()

	v, err := NewVerifier(context.Background(), testSupabaseURL, server.URL, testSecret)
	if err != nil {
		t.Fatalf("expected HS256 fallback to succeed, got error: %v", err)
	}
	if _, err := v.Verify(hs256Token(t, validClaims())); err != nil {
		t.Fatalf("expected valid HS256 token to verify, got error: %v", err)
	}
}

func TestVerify_RS256ViaJWKS(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	const kid = "test-key-1"

	jwks := map[string]any{
		"keys": []map[string]string{{
			"kty": "RSA",
			"alg": "RS256",
			"use": "sig",
			"kid": kid,
			"n":   base64.RawURLEncoding.EncodeToString(key.PublicKey.N.Bytes()),
			"e":   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.PublicKey.E)).Bytes()),
		}},
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(jwks)
	}))
	defer server.Close()

	v, err := NewVerifier(context.Background(), testSupabaseURL, server.URL, "")
	if err != nil {
		t.Fatal(err)
	}

	jwtToken := jwt.NewWithClaims(jwt.SigningMethodRS256, validClaims())
	jwtToken.Header["kid"] = kid
	signed, err := jwtToken.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}

	sub, err := v.Verify(signed)
	if err != nil {
		t.Fatalf("expected valid RS256 token, got error: %v", err)
	}
	if sub != testUserID {
		t.Fatalf("expected sub %q, got %q", testUserID, sub)
	}

	// Токен, подписанный другим ключом с тем же kid, должен отклоняться.
	otherKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	forged := jwt.NewWithClaims(jwt.SigningMethodRS256, validClaims())
	forged.Header["kid"] = kid
	forgedSigned, err := forged.SignedString(otherKey)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := v.Verify(forgedSigned); err == nil {
		t.Fatal("expected error for token signed with an unknown key")
	}
}
