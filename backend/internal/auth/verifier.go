package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

// Verifier validates Supabase-issued access tokens. Supabase projects sign
// tokens either with the legacy shared HS256 secret or with asymmetric keys
// published at the JWKS endpoint; both paths are supported and selected per
// token, which also survives a key-rotation migration mid-flight.
type Verifier struct {
	issuer   string
	hsSecret []byte
	jwks     keyfunc.Keyfunc
	parser   *jwt.Parser
}

func NewVerifier(ctx context.Context, supabaseURL, jwksURL, hsSecret string) (*Verifier, error) {
	v := &Verifier{
		issuer:   strings.TrimRight(supabaseURL, "/") + "/auth/v1",
		hsSecret: []byte(hsSecret),
		parser: jwt.NewParser(
			jwt.WithValidMethods([]string{"HS256", "RS256", "ES256"}),
			jwt.WithExpirationRequired(),
			jwt.WithAudience("authenticated"),
		),
	}

	if jwksURL != "" {
		keyCount, err := countJWKSKeys(ctx, jwksURL)
		switch {
		case err != nil:
			if hsSecret == "" {
				return nil, fmt.Errorf("fetch JWKS from %s: %w (and no SUPABASE_JWT_SECRET fallback configured)", jwksURL, err)
			}
			slog.Warn("JWKS unavailable, falling back to HS256 only", "url", jwksURL, "error", err)
		case keyCount == 0:
			// Empty {"keys":[]} is the normal response for a project still on
			// legacy shared-secret signing — not an error, just no RS256/ES256 keys yet.
			slog.Info("JWKS has no keys; assuming legacy HS256 signing", "url", jwksURL)
		default:
			jwks, err := keyfunc.NewDefaultCtx(ctx, []string{jwksURL})
			if err != nil {
				return nil, fmt.Errorf("init JWKS keyfunc for %s: %w", jwksURL, err)
			}
			v.jwks = jwks
		}
	}

	if v.jwks == nil && hsSecret == "" {
		return nil, errors.New("no JWT verification method available: JWKS has no keys and SUPABASE_JWT_SECRET is not set")
	}

	return v, nil
}

func countJWKSKeys(ctx context.Context, jwksURL string) (int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, jwksURL, nil)
	if err != nil {
		return 0, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("unexpected status %s", resp.Status)
	}

	var body struct {
		Keys []json.RawMessage `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return 0, err
	}
	return len(body.Keys), nil
}

// Verify returns the authenticated user id (JWT `sub`) or an error.
func (v *Verifier) Verify(tokenString string) (string, error) {
	claims := jwt.MapClaims{}
	_, err := v.parser.ParseWithClaims(tokenString, claims, v.keyFor)
	if err != nil {
		return "", err
	}

	iss, err := claims.GetIssuer()
	if err != nil || iss != v.issuer {
		return "", fmt.Errorf("unexpected issuer %q", iss)
	}

	sub, err := claims.GetSubject()
	if err != nil || sub == "" {
		return "", errors.New("token has no subject")
	}
	return sub, nil
}

func (v *Verifier) keyFor(token *jwt.Token) (any, error) {
	if _, isHMAC := token.Method.(*jwt.SigningMethodHMAC); isHMAC {
		if len(v.hsSecret) == 0 {
			return nil, errors.New("HS256 token received but SUPABASE_JWT_SECRET is not configured")
		}
		return v.hsSecret, nil
	}
	if v.jwks == nil {
		return nil, errors.New("asymmetric token received but JWKS is not configured")
	}
	return v.jwks.Keyfunc(token)
}
