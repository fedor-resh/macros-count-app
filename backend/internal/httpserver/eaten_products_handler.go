package httpserver

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/fedor-resh/bite/backend/internal/repo"
	"github.com/go-chi/chi/v5"
)

type EatenProductsRepo interface {
	ListInRange(ctx context.Context, userID, from, to string) ([]repo.EatenProduct, error)
	ListHistory(ctx context.Context, userID, search string, limit int) ([]repo.EatenProduct, error)
	Insert(ctx context.Context, userID string, in repo.EatenProductInput) (repo.EatenProduct, error)
	Update(ctx context.Context, userID string, id int64, in repo.EatenProductInput) (*repo.EatenProduct, error)
	Delete(ctx context.Context, userID string, id int64) (*repo.EatenProduct, error)
}

type EatenProductsHandler struct {
	repo EatenProductsRepo
}

func NewEatenProductsHandler(r EatenProductsRepo) *EatenProductsHandler {
	return &EatenProductsHandler{repo: r}
}

func (h *EatenProductsHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := UserID(r.Context())
	q := r.URL.Query()

	from, to := q.Get("from"), q.Get("to")
	if from != "" && to != "" {
		items, err := h.repo.ListInRange(r.Context(), userID, from, to)
		if err != nil {
			writeInternalError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, items)
		return
	}

	limit := 50
	if raw := q.Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > 500 {
			writeError(w, http.StatusBadRequest, "invalid limit")
			return
		}
		limit = parsed
	}
	items, err := h.repo.ListHistory(r.Context(), userID, q.Get("search"), limit)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *EatenProductsHandler) Create(w http.ResponseWriter, r *http.Request) {
	var in repo.EatenProductInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	item, err := h.repo.Insert(r.Context(), UserID(r.Context()), in)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	// PostgREST .insert().select() returned an array; keep that shape.
	writeJSON(w, http.StatusCreated, []repo.EatenProduct{item})
}

func (h *EatenProductsHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var in repo.EatenProductInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	item, err := h.repo.Update(r.Context(), UserID(r.Context()), id, in)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	if item == nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, []repo.EatenProduct{*item})
}

func (h *EatenProductsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	item, err := h.repo.Delete(r.Context(), UserID(r.Context()), id)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	if item == nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, []repo.EatenProduct{*item})
}
