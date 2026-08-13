package httpserver

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/fedor-resh/bite/backend/internal/auth"
	"github.com/fedor-resh/bite/backend/internal/repo"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const (
	refreshCookieName = "refresh_token"
	oauthStateCookie  = "oauth_state"
	oauthStateTTL     = 10 * time.Minute
)

type AccessTokener interface {
	Issue(userID string) (string, error)
}

type AccountsRepo interface {
	FindByEmail(ctx context.Context, email string) (*repo.Account, error)
	FindByGoogleSub(ctx context.Context, sub string) (*repo.Account, error)
	CreateWithPassword(ctx context.Context, email, passwordHash string) (repo.Account, error)
	CreateWithGoogle(ctx context.Context, email, googleSub string) (repo.Account, error)
	AttachGoogleSub(ctx context.Context, userID, googleSub string) error
	SetPasswordHash(ctx context.Context, userID, passwordHash string) error
	InsertRefresh(ctx context.Context, userID string, hash []byte) (time.Time, error)
	GetRefresh(ctx context.Context, hash []byte) (*repo.RefreshRecord, error)
	RevokeRefresh(ctx context.Context, id int64) error
	RotateRefresh(ctx context.Context, oldID int64, userID string, newHash []byte) (time.Time, error)
}

type AuthHandler struct {
	accounts     AccountsRepo
	tokens       AccessTokener
	google       auth.GoogleExchanger
	publicOrigin string
	cookieSecure bool
}

func NewAuthHandler(accounts AccountsRepo, tokens AccessTokener, google auth.GoogleExchanger, publicOrigin string) *AuthHandler {
	return &AuthHandler{
		accounts:     accounts,
		tokens:       tokens,
		google:       google,
		publicOrigin: strings.TrimRight(publicOrigin, "/"),
		cookieSecure: strings.HasPrefix(publicOrigin, "https://"),
	}
}

func (h *AuthHandler) Routes() http.Handler {
	r := chi.NewRouter()
	r.Post("/register", h.Register)
	r.Post("/login", h.Login)
	r.Post("/refresh", h.Refresh)
	r.Post("/logout", h.Logout)
	if h.google != nil {
		r.Get("/google/start", h.GoogleStart)
		r.Get("/google/callback", h.GoogleCallback)
	}
	return r
}

type credentialsBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type sessionUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

type sessionResponse struct {
	AccessToken string      `json:"accessToken"`
	User        sessionUser `json:"user"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var body credentialsBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	email, err := normalizeEmail(body.Email)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	hash, err := auth.HashPassword(body.Password)
	if err != nil {
		if errors.Is(err, auth.ErrPasswordTooShort) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeInternalError(w, err)
		return
	}

	account, err := h.accounts.CreateWithPassword(r.Context(), email, hash)
	if err != nil {
		if isUniqueViolation(err) {
			writeError(w, http.StatusConflict, "email already registered")
			return
		}
		writeInternalError(w, err)
		return
	}
	h.issueSession(w, r, account)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var body credentialsBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	email, err := normalizeEmail(body.Email)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	account, err := h.accounts.FindByEmail(r.Context(), email)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	if account == nil || account.PasswordHash == nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	if err := auth.CheckPassword(*account.PasswordHash, body.Password); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	h.issueSession(w, r, *account)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	raw, err := r.Cookie(refreshCookieName)
	if err != nil || raw.Value == "" {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	hash, err := repo.HashRefreshToken(raw.Value)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	rec, err := h.accounts.GetRefresh(r.Context(), hash)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	if rec == nil || rec.Revoked || time.Now().After(rec.ExpiresAt) {
		h.clearRefreshCookie(w)
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	newRaw, newHash, err := repo.NewRefreshToken()
	if err != nil {
		writeInternalError(w, err)
		return
	}
	expires, err := h.accounts.RotateRefresh(r.Context(), rec.ID, rec.UserID, newHash)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	h.setRefreshCookie(w, newRaw, expires)

	token, err := h.tokens.Issue(rec.UserID)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	email := ""
	if rec.Email != nil {
		email = *rec.Email
	}
	writeJSON(w, http.StatusOK, sessionResponse{
		AccessToken: token,
		User:        sessionUser{ID: rec.UserID, Email: email},
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if raw, err := r.Cookie(refreshCookieName); err == nil && raw.Value != "" {
		if hash, err := repo.HashRefreshToken(raw.Value); err == nil {
			if rec, err := h.accounts.GetRefresh(r.Context(), hash); err == nil && rec != nil {
				_ = h.accounts.RevokeRefresh(r.Context(), rec.ID)
			}
		}
	}
	h.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) GoogleStart(w http.ResponseWriter, r *http.Request) {
	state, err := randomState()
	if err != nil {
		writeInternalError(w, err)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     oauthStateCookie,
		Value:    state,
		Path:     "/api/v1/auth",
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(oauthStateTTL.Seconds()),
	})
	http.Redirect(w, r, h.google.AuthURL(state), http.StatusFound)
}

func (h *AuthHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	fail := func() {
		http.Redirect(w, r, h.publicOrigin+"/login?error=google", http.StatusFound)
	}

	stateCookie, err := r.Cookie(oauthStateCookie)
	if err != nil || stateCookie.Value == "" || r.URL.Query().Get("state") != stateCookie.Value {
		fail()
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     oauthStateCookie,
		Path:     "/api/v1/auth",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.cookieSecure,
	})

	code := r.URL.Query().Get("code")
	if code == "" {
		fail()
		return
	}
	profile, err := h.google.Exchange(r.Context(), code)
	if err != nil {
		fail()
		return
	}

	account, err := h.lookupOrCreateGoogle(r.Context(), profile)
	if err != nil {
		fail()
		return
	}
	if err := h.setSessionCookies(w, r, account); err != nil {
		fail()
		return
	}
	http.Redirect(w, r, h.publicOrigin+"/auth/callback", http.StatusFound)
}

func (h *AuthHandler) lookupOrCreateGoogle(ctx context.Context, profile auth.GoogleUser) (repo.Account, error) {
	if existing, err := h.accounts.FindByGoogleSub(ctx, profile.Sub); err != nil {
		return repo.Account{}, err
	} else if existing != nil {
		return *existing, nil
	}
	if byEmail, err := h.accounts.FindByEmail(ctx, profile.Email); err != nil {
		return repo.Account{}, err
	} else if byEmail != nil {
		if err := h.accounts.AttachGoogleSub(ctx, byEmail.ID, profile.Sub); err != nil {
			return repo.Account{}, err
		}
		byEmail.GoogleSub = &profile.Sub
		return *byEmail, nil
	}
	return h.accounts.CreateWithGoogle(ctx, profile.Email, profile.Sub)
}

func (h *AuthHandler) issueSession(w http.ResponseWriter, r *http.Request, account repo.Account) {
	if err := h.setSessionCookies(w, r, account); err != nil {
		writeInternalError(w, err)
		return
	}
	token, err := h.tokens.Issue(account.ID)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	email := ""
	if account.Email != nil {
		email = *account.Email
	}
	writeJSON(w, http.StatusOK, sessionResponse{
		AccessToken: token,
		User:        sessionUser{ID: account.ID, Email: email},
	})
}

func (h *AuthHandler) setSessionCookies(w http.ResponseWriter, r *http.Request, account repo.Account) error {
	raw, hash, err := repo.NewRefreshToken()
	if err != nil {
		return err
	}
	expires, err := h.accounts.InsertRefresh(r.Context(), account.ID, hash)
	if err != nil {
		return err
	}
	h.setRefreshCookie(w, raw, expires)
	return nil
}

func (h *AuthHandler) setRefreshCookie(w http.ResponseWriter, raw string, expires time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    raw,
		Path:     "/api/v1/auth",
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteLaxMode,
		Expires:  expires,
	})
}

func (h *AuthHandler) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Path:     "/api/v1/auth",
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	hash, err := auth.HashPassword(body.Password)
	if err != nil {
		if errors.Is(err, auth.ErrPasswordTooShort) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeInternalError(w, err)
		return
	}
	if err := h.accounts.SetPasswordHash(r.Context(), UserID(r.Context()), hash); err != nil {
		writeInternalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func normalizeEmail(email string) (string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || !strings.Contains(email, "@") {
		return "", errors.New("invalid email")
	}
	return email, nil
}

func randomState() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
