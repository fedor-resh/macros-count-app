package httpserver

import (
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

// ImagesHandler serves uploaded images from the disk-storage root without
// auth (the Supabase bucket was public too). Directory listings are refused,
// and filenames are timestamped and never overwritten, hence immutable caching.
func ImagesHandler(root string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rel := strings.TrimPrefix(r.URL.Path, "/images/")
		clean := strings.TrimPrefix(path.Clean("/"+rel), "/")
		if clean == "" || clean == "." {
			http.NotFound(w, r)
			return
		}

		full := filepath.Join(root, filepath.FromSlash(clean))
		info, err := os.Stat(full)
		if err != nil || info.IsDir() {
			http.NotFound(w, r)
			return
		}

		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		http.ServeFile(w, r, full)
	})
}
