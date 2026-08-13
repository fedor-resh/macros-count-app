package httpserver

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/fedor-resh/macros-count-app/backend/internal/storage"
)

const maxUploadBytes = 15 << 20 // frontend compresses images before upload

type PendingInserter interface {
	InsertPending(ctx context.Context, userID, date, imageURL string) (int64, error)
}

type Analyzer interface {
	// imageRef — то, что уйдёт LLM как image_url: data-URL с байтами картинки,
	// чтобы не требовать публичной доступности файла до анализа.
	Start(id int64, userID, imageRef string)
}

type PhotoHandler struct {
	storage  storage.Storage
	repo     PendingInserter
	analyzer Analyzer
}

func NewPhotoHandler(s storage.Storage, r PendingInserter, a Analyzer) *PhotoHandler {
	return &PhotoHandler{storage: s, repo: r, analyzer: a}
}

// Analyze ports the analyze-food-photo edge function: store the image, insert
// a pending row, respond immediately, analyze in the background.
func (h *PhotoHandler) Analyze(w http.ResponseWriter, r *http.Request) {
	userID := UserID(r.Context())

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)
	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		writeError(w, http.StatusBadRequest, "invalid multipart form: "+err.Error())
		return
	}

	file, header, err := r.FormFile("photo")
	if err != nil {
		writeError(w, http.StatusBadRequest, "No photo provided")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}

	path := fmt.Sprintf("%s/photo-%d.%s", userID, time.Now().UnixMilli(), fileExt(header.Filename))
	imageURL, err := h.storage.Upload(r.Context(), path, contentType, data)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	id, err := h.repo.InsertPending(r.Context(), userID, normalizeDate(r.FormValue("date")), imageURL)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	llmImageRef := "data:" + contentType + ";base64," + base64.StdEncoding.EncodeToString(data)
	h.analyzer.Start(id, userID, llmImageRef)

	writeJSON(w, http.StatusOK, map[string]any{
		"id":       id,
		"status":   "pending",
		"imageUrl": imageURL,
	})
}

func fileExt(filename string) string {
	ext := strings.TrimPrefix(strings.ToLower(filepath.Ext(filename)), ".")
	if ext == "" {
		return "jpg"
	}
	return ext
}

func normalizeDate(date string) string {
	if trimmed := strings.TrimSpace(date); trimmed != "" {
		return trimmed
	}
	return time.Now().Format("2006-01-02")
}
