package httpserver

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/fedor-resh/macros-count-app/backend/internal/repo"
)

type UsersRepo interface {
	GetOrCreate(ctx context.Context, userID string) (repo.User, error)
	UpsertGoals(ctx context.Context, userID string, caloriesGoal, proteinGoal int) (repo.User, error)
	UpdateParams(ctx context.Context, userID string, in repo.UserParamsInput) (repo.User, error)
}

type UsersHandler struct {
	repo UsersRepo
}

func NewUsersHandler(r UsersRepo) *UsersHandler {
	return &UsersHandler{repo: r}
}

func (h *UsersHandler) Me(w http.ResponseWriter, r *http.Request) {
	user, err := h.repo.GetOrCreate(r.Context(), UserID(r.Context()))
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (h *UsersHandler) UpsertGoals(w http.ResponseWriter, r *http.Request) {
	var body struct {
		CaloriesGoal *int `json:"caloriesGoal"`
		ProteinGoal  *int `json:"proteinGoal"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if body.CaloriesGoal == nil || body.ProteinGoal == nil {
		writeError(w, http.StatusBadRequest, "caloriesGoal and proteinGoal are required")
		return
	}

	user, err := h.repo.UpsertGoals(r.Context(), UserID(r.Context()), *body.CaloriesGoal, *body.ProteinGoal)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (h *UsersHandler) UpdateParams(w http.ResponseWriter, r *http.Request) {
	var in repo.UserParamsInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	user, err := h.repo.UpdateParams(r.Context(), UserID(r.Context()), in)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}
