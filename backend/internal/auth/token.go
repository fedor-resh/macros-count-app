package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	accessTTL = 15 * time.Minute
	audience  = "bite"
)

// Tokens issues and verifies our own HS256 access JWTs. The subject is the
// user's UUID — the same value AuthMiddleware stores in request context.
type Tokens struct {
	secret []byte
	issuer string
}

func NewTokens(secret, issuer string) (*Tokens, error) {
	if secret == "" {
		return nil, errors.New("AUTH_JWT_SECRET is required")
	}
	if issuer == "" {
		return nil, errors.New("PUBLIC_BASE_URL is required to set the JWT issuer")
	}
	return &Tokens{secret: []byte(secret), issuer: issuer}, nil
}

func (t *Tokens) Issue(userID string) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub": userID,
		"iss": t.issuer,
		"aud": audience,
		"iat": now.Unix(),
		"exp": now.Add(accessTTL).Unix(),
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(t.secret)
	if err != nil {
		return "", fmt.Errorf("sign access token: %w", err)
	}
	return token, nil
}

// Verify returns the authenticated user id (JWT `sub`) or an error.
func (t *Tokens) Verify(tokenString string) (string, error) {
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithExpirationRequired(),
		jwt.WithAudience(audience),
		jwt.WithIssuer(t.issuer),
	)
	claims := jwt.MapClaims{}
	if _, err := parser.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
		return t.secret, nil
	}); err != nil {
		return "", err
	}
	sub, err := claims.GetSubject()
	if err != nil || sub == "" {
		return "", errors.New("token has no subject")
	}
	return sub, nil
}
