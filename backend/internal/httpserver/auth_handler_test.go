package httpserver

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/fedor-resh/bite/backend/internal/auth"
	"github.com/fedor-resh/bite/backend/internal/events"
	"github.com/fedor-resh/bite/backend/internal/repo"
	"github.com/jackc/pgx/v5/pgconn"
)

type fakeAccounts struct {
	mu       sync.Mutex
	byEmail  map[string]repo.Account
	byGoogle map[string]repo.Account
	refresh  map[string]repo.RefreshRecord // hash string -> record
	nextID   int64
}

func newFakeAccounts() *fakeAccounts {
	return &fakeAccounts{
		byEmail:  map[string]repo.Account{},
		byGoogle: map[string]repo.Account{},
		refresh:  map[string]repo.RefreshRecord{},
		nextID:   1,
	}
}

func (f *fakeAccounts) FindByEmail(_ context.Context, email string) (*repo.Account, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.byEmail[email]
	if !ok {
		return nil, nil
	}
	cp := a
	return &cp, nil
}

func (f *fakeAccounts) FindByGoogleSub(_ context.Context, sub string) (*repo.Account, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.byGoogle[sub]
	if !ok {
		return nil, nil
	}
	cp := a
	return &cp, nil
}

func (f *fakeAccounts) CreateWithPassword(_ context.Context, email, passwordHash string) (repo.Account, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, exists := f.byEmail[email]; exists {
		return repo.Account{}, &pgconn.PgError{Code: "23505"}
	}
	emailCopy := email
	hashCopy := passwordHash
	a := repo.Account{ID: "user-" + email, Email: &emailCopy, PasswordHash: &hashCopy}
	f.byEmail[email] = a
	return a, nil
}

func (f *fakeAccounts) CreateWithGoogle(_ context.Context, email, googleSub, name, avatarURL string) (repo.Account, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	emailCopy := email
	subCopy := googleSub
	a := repo.Account{ID: "user-" + email, Email: &emailCopy, GoogleSub: &subCopy}
	a.Name, a.AvatarURL = optional(name), optional(avatarURL)
	f.byEmail[email] = a
	f.byGoogle[googleSub] = a
	return a, nil
}

func (f *fakeAccounts) LinkGoogle(_ context.Context, userID, googleSub, name, avatarURL string) (repo.Account, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for email, a := range f.byEmail {
		if a.ID != userID {
			continue
		}
		sub := googleSub
		a.GoogleSub = &sub
		if n := optional(name); n != nil {
			a.Name = n
		}
		if u := optional(avatarURL); u != nil {
			a.AvatarURL = u
		}
		f.byEmail[email] = a
		f.byGoogle[googleSub] = a
		return a, nil
	}
	return repo.Account{}, nil
}

func optional(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func (f *fakeAccounts) SetPasswordHash(_ context.Context, userID, passwordHash string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for email, a := range f.byEmail {
		if a.ID == userID {
			h := passwordHash
			a.PasswordHash = &h
			f.byEmail[email] = a
		}
	}
	return nil
}

func (f *fakeAccounts) InsertRefresh(_ context.Context, userID string, hash []byte) (time.Time, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	id := f.nextID
	f.nextID++
	expires := time.Now().Add(time.Hour)
	rec := repo.RefreshRecord{ID: id, UserID: userID, ExpiresAt: expires}
	if a := f.accountOf(userID); a != nil {
		rec.Email, rec.Name, rec.AvatarURL = a.Email, a.Name, a.AvatarURL
	}
	f.refresh[string(hash)] = rec
	return expires, nil
}

func (f *fakeAccounts) GetRefresh(_ context.Context, hash []byte) (*repo.RefreshRecord, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	rec, ok := f.refresh[string(hash)]
	if !ok {
		return nil, nil
	}
	cp := rec
	return &cp, nil
}

func (f *fakeAccounts) RevokeRefresh(_ context.Context, id int64) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for k, rec := range f.refresh {
		if rec.ID == id {
			rec.Revoked = true
			f.refresh[k] = rec
		}
	}
	return nil
}

func (f *fakeAccounts) RotateRefresh(ctx context.Context, oldID int64, userID string, newHash []byte) (time.Time, error) {
	if err := f.RevokeRefresh(ctx, oldID); err != nil {
		return time.Time{}, err
	}
	return f.InsertRefresh(ctx, userID, newHash)
}

func (f *fakeAccounts) accountOf(userID string) *repo.Account {
	for _, a := range f.byEmail {
		if a.ID == userID {
			cp := a
			return &cp
		}
	}
	return nil
}

type errUnique struct{}

func (errUnique) Error() string { return "unique" }

func (errUnique) SQLState() string { return "23505" }

type fakeGoogle struct {
	user   auth.GoogleUser
	fail   bool
	states []string
}

func (g *fakeGoogle) AuthURL(state string) string {
	g.states = append(g.states, state)
	return "https://accounts.google.com/o/oauth2/v2/auth?state=" + state
}

func (g *fakeGoogle) Exchange(_ context.Context, _ string) (auth.GoogleUser, error) {
	if g.fail {
		return auth.GoogleUser{}, errUnique{}
	}
	return g.user, nil
}

type stubTokens struct{}

func (stubTokens) Issue(userID string) (string, error) { return "access-" + userID, nil }

func newAuthTestEnv(google auth.GoogleExchanger) (*AuthHandler, *fakeAccounts, http.Handler) {
	accounts := newFakeAccounts()
	h := NewAuthHandler(accounts, stubTokens{}, google, "http://localhost:5173")
	router := NewRouter(fakeVerifier{}, Handlers{
		Auth:          h,
		EatenProducts: NewEatenProductsHandler(newFakeEatenRepo()),
		Products:      NewProductsHandler(fakeProductsRepo{}),
		Users:         NewUsersHandler(&fakeUsersRepo{}),
		Photo:         NewPhotoHandler(fakeStorage{}, fakePendingInserter{repo: newFakeEatenRepo()}, fakeAnalyzer{}),
		SSE:           NewSSEHandler(events.NewBroker()),
	}, nil)
	return h, accounts, router
}

func TestAuth_RegisterAndLogin(t *testing.T) {
	_, _, router := newAuthTestEnv(nil)

	body := `{"email":"A@Example.com","password":"secret1"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("register: expected 200, got %d: %s", rec.Code, rec.Body)
	}
	var session sessionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &session); err != nil {
		t.Fatal(err)
	}
	if session.User.Email != "a@example.com" {
		t.Fatalf("email not normalized: %q", session.User.Email)
	}
	if rec.Result().Cookies()[0].Name != refreshCookieName {
		t.Fatal("expected refresh cookie")
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("login: expected 200, got %d: %s", rec.Code, rec.Body)
	}
}

func TestAuth_LoginWrongPassword(t *testing.T) {
	_, accounts, router := newAuthTestEnv(nil)
	hash, err := auth.HashPassword("secret1")
	if err != nil {
		t.Fatal(err)
	}
	email := "a@example.com"
	accounts.byEmail[email] = repo.Account{ID: "u1", Email: &email, PasswordHash: &hash}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login",
		strings.NewReader(`{"email":"a@example.com","password":"nope123"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestAuth_RefreshRotatesToken(t *testing.T) {
	_, _, router := newAuthTestEnv(nil)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register",
		strings.NewReader(`{"email":"a@example.com","password":"secret1"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("register: %d %s", rec.Code, rec.Body)
	}
	first := rec.Result().Cookies()[0]

	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	req.AddCookie(first)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("refresh: expected 200, got %d: %s", rec.Code, rec.Body)
	}
	second := rec.Result().Cookies()[0]
	if second.Value == first.Value {
		t.Fatal("refresh token was not rotated")
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	req.AddCookie(first)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("reusing revoked refresh: expected 401, got %d", rec.Code)
	}
}

func TestAuth_LogoutRevokesRefresh(t *testing.T) {
	_, _, router := newAuthTestEnv(nil)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register",
		strings.NewReader(`{"email":"a@example.com","password":"secret1"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	cookie := rec.Result().Cookies()[0]

	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	req.AddCookie(cookie)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("logout: expected 204, got %d", rec.Code)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	req.AddCookie(cookie)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("refresh after logout: expected 401, got %d", rec.Code)
	}
}

func TestAuth_PublicRoutesDoNotRequireToken(t *testing.T) {
	_, _, router := newAuthTestEnv(nil)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login",
		strings.NewReader(`{"email":"nobody@example.com","password":"secret1"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code == http.StatusUnauthorized && rec.Body.String() == `{"error":"missing bearer token"}`+"\n" {
		t.Fatal("/auth/login was protected by AuthMiddleware")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 invalid credentials, got %d: %s", rec.Code, rec.Body)
	}
}

func TestAuth_GoogleCallbackRejectsBadState(t *testing.T) {
	g := &fakeGoogle{user: auth.GoogleUser{Sub: "g1", Email: "a@example.com"}}
	_, _, router := newAuthTestEnv(g)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/google/start", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusFound {
		t.Fatalf("start: expected 302, got %d", rec.Code)
	}
	stateCookie := rec.Result().Cookies()[0]

	req = httptest.NewRequest(http.MethodGet, "/api/v1/auth/google/callback?code=abc&state=forged", nil)
	req.AddCookie(stateCookie)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusFound {
		t.Fatalf("callback: expected 302, got %d", rec.Code)
	}
	if loc := rec.Header().Get("Location"); !strings.Contains(loc, "/login?error=google") {
		t.Fatalf("expected redirect to login error, got %q", loc)
	}
}

func TestAuth_GoogleCallbackSuccess(t *testing.T) {
	g := &fakeGoogle{user: auth.GoogleUser{Sub: "g1", Email: "a@example.com"}}
	_, _, router := newAuthTestEnv(g)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/google/start", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	stateCookie := rec.Result().Cookies()[0]
	state := g.states[0]

	req = httptest.NewRequest(http.MethodGet, "/api/v1/auth/google/callback?code=abc&state="+state, nil)
	req.AddCookie(stateCookie)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusFound {
		t.Fatalf("callback: expected 302, got %d", rec.Code)
	}
	if loc := rec.Header().Get("Location"); loc != "http://localhost:5173/auth/callback" {
		t.Fatalf("unexpected redirect %q", loc)
	}
	found := false
	for _, c := range rec.Result().Cookies() {
		if c.Name == refreshCookieName && c.Value != "" {
			found = true
		}
	}
	if !found {
		t.Fatal("expected refresh cookie after google login")
	}
}

func TestAuth_GoogleProfileReachesSession(t *testing.T) {
	g := &fakeGoogle{user: auth.GoogleUser{
		Sub:     "g1",
		Email:   "a@example.com",
		Name:    "Фёдор",
		Picture: "https://lh3.googleusercontent.com/a/pic",
	}}
	_, _, router := newAuthTestEnv(g)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/google/start", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	stateCookie := rec.Result().Cookies()[0]

	req = httptest.NewRequest(http.MethodGet, "/api/v1/auth/google/callback?code=abc&state="+g.states[0], nil)
	req.AddCookie(stateCookie)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	var refreshCookie *http.Cookie
	for _, c := range rec.Result().Cookies() {
		if c.Name == refreshCookieName {
			refreshCookie = c
		}
	}
	if refreshCookie == nil {
		t.Fatal("expected refresh cookie after google login")
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	req.AddCookie(refreshCookie)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("refresh: expected 200, got %d: %s", rec.Code, rec.Body)
	}
	var session sessionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &session); err != nil {
		t.Fatal(err)
	}
	if session.User.Name != "Фёдор" {
		t.Fatalf("name lost: %q", session.User.Name)
	}
	if session.User.AvatarURL != "https://lh3.googleusercontent.com/a/pic" {
		t.Fatalf("avatar lost: %q", session.User.AvatarURL)
	}
}
