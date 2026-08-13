package httpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/fedor-resh/bite/backend/internal/events"
	"github.com/fedor-resh/bite/backend/internal/repo"
)

// Эти тесты — замена гарантий RLS: пользователь A не может читать и менять
// строки пользователя B, а userId всегда берётся из токена, не из запроса.

const (
	userA = "aaaaaaaa-0000-0000-0000-000000000000"
	userB = "bbbbbbbb-0000-0000-0000-000000000000"
)

type fakeVerifier struct{}

// Verify treats the bearer token itself as the user id ("token-<uuid>").
func (fakeVerifier) Verify(token string) (string, error) {
	if userID, ok := strings.CutPrefix(token, "token-"); ok {
		return userID, nil
	}
	return "", errors.New("invalid token")
}

type fakeEatenRepo struct {
	rows map[int64]repo.EatenProduct

	listUserID   string
	insertUserID string
	nextID       int64
}

func newFakeEatenRepo() *fakeEatenRepo {
	return &fakeEatenRepo{rows: map[int64]repo.EatenProduct{}, nextID: 1}
}

func (f *fakeEatenRepo) seed(userID string) repo.EatenProduct {
	id := f.nextID
	f.nextID++
	row := repo.EatenProduct{ID: id, Name: "Борщ", Status: "completed", UserID: &userID}
	f.rows[id] = row
	return row
}

func (f *fakeEatenRepo) owned(userID string, id int64) (repo.EatenProduct, bool) {
	row, ok := f.rows[id]
	if !ok || row.UserID == nil || *row.UserID != userID {
		return repo.EatenProduct{}, false
	}
	return row, true
}

func (f *fakeEatenRepo) ListInRange(_ context.Context, userID, _, _ string) ([]repo.EatenProduct, error) {
	f.listUserID = userID
	items := []repo.EatenProduct{}
	for _, row := range f.rows {
		if row.UserID != nil && *row.UserID == userID {
			items = append(items, row)
		}
	}
	return items, nil
}

func (f *fakeEatenRepo) ListHistory(ctx context.Context, userID, _ string, _ int) ([]repo.EatenProduct, error) {
	return f.ListInRange(ctx, userID, "", "")
}

func (f *fakeEatenRepo) Insert(_ context.Context, userID string, in repo.EatenProductInput) (repo.EatenProduct, error) {
	f.insertUserID = userID
	id := f.nextID
	f.nextID++
	name := "Продукт"
	if in.Name != nil {
		name = *in.Name
	}
	row := repo.EatenProduct{ID: id, Name: name, Status: "completed", UserID: &userID}
	f.rows[id] = row
	return row, nil
}

func (f *fakeEatenRepo) Update(_ context.Context, userID string, id int64, in repo.EatenProductInput) (*repo.EatenProduct, error) {
	row, ok := f.owned(userID, id)
	if !ok {
		return nil, nil
	}
	if in.Name != nil {
		row.Name = *in.Name
	}
	f.rows[id] = row
	return &row, nil
}

func (f *fakeEatenRepo) Delete(_ context.Context, userID string, id int64) (*repo.EatenProduct, error) {
	row, ok := f.owned(userID, id)
	if !ok {
		return nil, nil
	}
	delete(f.rows, id)
	return &row, nil
}

type fakeUsersRepo struct {
	lastUserID string
}

func (f *fakeUsersRepo) GetOrCreate(_ context.Context, userID string) (repo.User, error) {
	f.lastUserID = userID
	return repo.User{ID: userID, CaloriesGoal: 3000, ProteinGoal: 150}, nil
}

func (f *fakeUsersRepo) UpsertGoals(_ context.Context, userID string, caloriesGoal, proteinGoal int) (repo.User, error) {
	f.lastUserID = userID
	return repo.User{ID: userID, CaloriesGoal: caloriesGoal, ProteinGoal: proteinGoal}, nil
}

func (f *fakeUsersRepo) UpdateParams(_ context.Context, userID string, _ repo.UserParamsInput) (repo.User, error) {
	f.lastUserID = userID
	return repo.User{ID: userID}, nil
}

type fakeProductsRepo struct{}

func (fakeProductsRepo) Search(context.Context, string, int) ([]repo.Product, error) {
	return []repo.Product{}, nil
}

type fakePendingInserter struct{ repo *fakeEatenRepo }

func (f fakePendingInserter) InsertPending(ctx context.Context, userID, date, imageURL string) (int64, error) {
	row, err := f.repo.Insert(ctx, userID, repo.EatenProductInput{})
	return row.ID, err
}

type fakeStorage struct{}

func (fakeStorage) Upload(context.Context, string, string, []byte) (string, error) {
	return "https://example.com/images/test.jpg", nil
}

type fakeAnalyzer struct{}

func (fakeAnalyzer) Start(int64, string, string) {}

type testEnv struct {
	router http.Handler
	eaten  *fakeEatenRepo
	users  *fakeUsersRepo
}

func newTestEnv() testEnv {
	eaten := newFakeEatenRepo()
	users := &fakeUsersRepo{}
	router := NewRouter(fakeVerifier{}, Handlers{
		EatenProducts: NewEatenProductsHandler(eaten),
		Products:      NewProductsHandler(fakeProductsRepo{}),
		Users:         NewUsersHandler(users),
		Photo:         NewPhotoHandler(fakeStorage{}, fakePendingInserter{repo: eaten}, fakeAnalyzer{}),
		SSE:           NewSSEHandler(events.NewBroker()),
	}, nil)
	return testEnv{router: router, eaten: eaten, users: users}
}

func (e testEnv) do(t *testing.T, method, path, userID string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var reader *bytes.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		reader = bytes.NewReader(data)
	} else {
		reader = bytes.NewReader(nil)
	}

	req := httptest.NewRequest(method, path, reader)
	if userID != "" {
		req.Header.Set("Authorization", "Bearer token-"+userID)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	rec := httptest.NewRecorder()
	e.router.ServeHTTP(rec, req)
	return rec
}

func TestAuth_MissingTokenRejected(t *testing.T) {
	env := newTestEnv()
	for _, path := range []string{"/api/v1/eaten-products", "/api/v1/me", "/api/v1/products"} {
		rec := env.do(t, http.MethodGet, path, "", nil)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("%s: expected 401 without token, got %d", path, rec.Code)
		}
	}
}

func TestAuth_InvalidTokenRejected(t *testing.T) {
	env := newTestEnv()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/eaten-products", nil)
	req.Header.Set("Authorization", "Bearer garbage")
	rec := httptest.NewRecorder()
	env.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for invalid token, got %d", rec.Code)
	}
}

func TestList_ScopedToTokenUser(t *testing.T) {
	env := newTestEnv()
	env.eaten.seed(userA)
	env.eaten.seed(userB)

	rec := env.do(t, http.MethodGet, "/api/v1/eaten-products?from=2026-01-01&to=2026-01-07", userA, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body)
	}
	if env.eaten.listUserID != userA {
		t.Fatalf("repo received userID %q, expected the token's %q", env.eaten.listUserID, userA)
	}

	var items []repo.EatenProduct
	if err := json.Unmarshal(rec.Body.Bytes(), &items); err != nil {
		t.Fatal(err)
	}
	for _, item := range items {
		if item.UserID == nil || *item.UserID != userA {
			t.Fatalf("response leaked a row of another user: %+v", item)
		}
	}
}

func TestUpdate_OtherUsersRowIs404(t *testing.T) {
	env := newTestEnv()
	row := env.eaten.seed(userB)

	rec := env.do(t, http.MethodPatch, fmt.Sprintf("/api/v1/eaten-products/%d", row.ID), userA,
		map[string]any{"name": "hacked"})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 updating another user's row, got %d", rec.Code)
	}
	if env.eaten.rows[row.ID].Name == "hacked" {
		t.Fatal("row of another user was modified")
	}
}

func TestDelete_OtherUsersRowIs404(t *testing.T) {
	env := newTestEnv()
	row := env.eaten.seed(userB)

	rec := env.do(t, http.MethodDelete, fmt.Sprintf("/api/v1/eaten-products/%d", row.ID), userA, nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 deleting another user's row, got %d", rec.Code)
	}
	if _, exists := env.eaten.rows[row.ID]; !exists {
		t.Fatal("row of another user was deleted")
	}
}

func TestCreate_IgnoresClientSuppliedUserID(t *testing.T) {
	env := newTestEnv()

	rec := env.do(t, http.MethodPost, "/api/v1/eaten-products", userA,
		map[string]any{"name": "Каша", "userId": userB})
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body)
	}
	if env.eaten.insertUserID != userA {
		t.Fatalf("insert used userID %q, expected the token's %q (client-supplied userId must be ignored)",
			env.eaten.insertUserID, userA)
	}

	var items []repo.EatenProduct
	if err := json.Unmarshal(rec.Body.Bytes(), &items); err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 {
		t.Fatalf("expected array with the created row, got %s", rec.Body)
	}
	if items[0].UserID == nil || *items[0].UserID != userA {
		t.Fatalf("created row belongs to %v, expected %q", items[0].UserID, userA)
	}
}

func TestMe_ScopedToTokenUser(t *testing.T) {
	env := newTestEnv()

	rec := env.do(t, http.MethodGet, "/api/v1/me", userA, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if env.users.lastUserID != userA {
		t.Fatalf("users repo received %q, expected %q", env.users.lastUserID, userA)
	}

	rec = env.do(t, http.MethodPut, "/api/v1/me/goals", userB,
		map[string]any{"caloriesGoal": 2500, "proteinGoal": 120})
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body)
	}
	if env.users.lastUserID != userB {
		t.Fatalf("goals upsert used %q, expected %q", env.users.lastUserID, userB)
	}
}
