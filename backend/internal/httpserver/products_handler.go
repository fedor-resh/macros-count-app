package httpserver

import (
	"context"
	"net/http"
	"strconv"

	"github.com/fedor-resh/macros-count-app/backend/internal/repo"
)

type ProductsRepo interface {
	Search(ctx context.Context, search string, limit int) ([]repo.Product, error)
}

type ProductsHandler struct {
	repo ProductsRepo
}

func NewProductsHandler(r ProductsRepo) *ProductsHandler {
	return &ProductsHandler{repo: r}
}

func (h *ProductsHandler) Search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	limit := 20
	if raw := q.Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > 200 {
			writeError(w, http.StatusBadRequest, "invalid limit")
			return
		}
		limit = parsed
	}

	items, err := h.repo.Search(r.Context(), q.Get("search"), limit)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}
