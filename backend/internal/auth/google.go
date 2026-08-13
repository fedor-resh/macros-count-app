package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

const (
	googleAuthURL     = "https://accounts.google.com/o/oauth2/v2/auth"
	googleTokenURL    = "https://oauth2.googleapis.com/token"
	googleUserInfoURL = "https://www.googleapis.com/oauth2/v3/userinfo"
	googleScope       = "openid email profile"
)

type GoogleUser struct {
	Sub   string
	Email string
}

// GoogleExchanger is the OAuth2 code-for-profile step. Tests swap it for a stub.
type GoogleExchanger interface {
	AuthURL(state string) string
	Exchange(ctx context.Context, code string) (GoogleUser, error)
}

type Google struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
	HTTPClient   *http.Client
}

func NewGoogle(clientID, clientSecret, redirectURI string) *Google {
	return &Google{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURI:  redirectURI,
		HTTPClient:   http.DefaultClient,
	}
}

func (g *Google) AuthURL(state string) string {
	q := url.Values{
		"client_id":     {g.ClientID},
		"redirect_uri":  {g.RedirectURI},
		"response_type": {"code"},
		"scope":         {googleScope},
		"state":         {state},
		"access_type":   {"online"},
		"prompt":        {"select_account"},
	}
	return googleAuthURL + "?" + q.Encode()
}

func (g *Google) Exchange(ctx context.Context, code string) (GoogleUser, error) {
	form := url.Values{
		"code":          {code},
		"client_id":     {g.ClientID},
		"client_secret": {g.ClientSecret},
		"redirect_uri":  {g.RedirectURI},
		"grant_type":    {"authorization_code"},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, googleTokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return GoogleUser{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := g.HTTPClient.Do(req)
	if err != nil {
		return GoogleUser{}, fmt.Errorf("google token exchange: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return GoogleUser{}, err
	}
	if resp.StatusCode != http.StatusOK {
		return GoogleUser{}, fmt.Errorf("google token exchange: status %s", resp.Status)
	}

	var token struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &token); err != nil {
		return GoogleUser{}, fmt.Errorf("google token response: %w", err)
	}
	if token.AccessToken == "" {
		return GoogleUser{}, fmt.Errorf("google oauth: missing access_token")
	}

	infoReq, err := http.NewRequestWithContext(ctx, http.MethodGet, googleUserInfoURL, nil)
	if err != nil {
		return GoogleUser{}, err
	}
	infoReq.Header.Set("Authorization", "Bearer "+token.AccessToken)
	infoResp, err := g.HTTPClient.Do(infoReq)
	if err != nil {
		return GoogleUser{}, fmt.Errorf("google userinfo: %w", err)
	}
	defer infoResp.Body.Close()
	infoBody, err := io.ReadAll(io.LimitReader(infoResp.Body, 1<<20))
	if err != nil {
		return GoogleUser{}, err
	}
	if infoResp.StatusCode != http.StatusOK {
		return GoogleUser{}, fmt.Errorf("google userinfo: status %s", infoResp.Status)
	}

	var info struct {
		Sub   string `json:"sub"`
		Email string `json:"email"`
	}
	if err := json.Unmarshal(infoBody, &info); err != nil {
		return GoogleUser{}, fmt.Errorf("google userinfo: %w", err)
	}
	if info.Sub == "" || info.Email == "" {
		return GoogleUser{}, fmt.Errorf("google oauth: userinfo missing sub or email")
	}
	return GoogleUser{Sub: info.Sub, Email: strings.ToLower(strings.TrimSpace(info.Email))}, nil
}
