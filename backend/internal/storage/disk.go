package storage

import (
	"context"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"
)

// Disk stores images on the local filesystem (Phase 3). Files land in
// {dataDir}/images/{path} and are served by the Go API itself at
// {publicBaseURL}/images/{path}.
type Disk struct {
	root    string
	baseURL string
}

func NewDisk(dataDir, publicBaseURL string) *Disk {
	return &Disk{
		root:    filepath.Join(dataDir, "images"),
		baseURL: strings.TrimRight(publicBaseURL, "/"),
	}
}

// Root returns the directory files are written to (used by the /images
// file-serving handler).
func (d *Disk) Root() string {
	return d.root
}

func (d *Disk) Upload(_ context.Context, p, _ string, data []byte) (string, error) {
	// Пути строятся сервером ({userId}/photo-{ts}.{ext}); любые ".."-сегменты
	// нелегитимны — отклоняем целиком, а не нормализуем.
	normalized := strings.ReplaceAll(p, "\\", "/")
	for _, segment := range strings.Split(normalized, "/") {
		if segment == ".." {
			return "", fmt.Errorf("invalid storage path %q", p)
		}
	}
	clean := strings.TrimPrefix(path.Clean("/"+normalized), "/")
	if clean == "" || clean == "." {
		return "", fmt.Errorf("invalid storage path %q", p)
	}

	full := filepath.Join(d.root, filepath.FromSlash(clean))
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return "", fmt.Errorf("create image dir: %w", err)
	}
	if err := os.WriteFile(full, data, 0o644); err != nil {
		return "", fmt.Errorf("write image: %w", err)
	}

	return d.baseURL + "/images/" + clean, nil
}
