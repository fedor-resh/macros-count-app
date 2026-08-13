// migrate-images — одноразовая команда Фазы 3: скачивает картинки из
// Supabase Storage на локальный диск и переписывает eaten_products."imageUrl".
// Идемпотентна и возобновляема: уже переписанные строки не матчатся WHERE,
// повторный запуск доделывает хвост. Запускать, пока бакет Supabase ещё жив.
//
// Env: DATABASE_URL, PUBLIC_BASE_URL (обязательные), DATA_DIR (default /data).
package main

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/fedor-resh/bite/backend/internal/storage"
	"github.com/jackc/pgx/v5/pgxpool"
)

const bucketMarker = "/storage/v1/object/public/images/"

// extractBucketPath returns the object path inside the images bucket
// ("{userId}/photo-....jpg") for a Supabase public URL, or ok=false for any
// other URL (already migrated rows, external images).
func extractBucketPath(imageURL string) (string, bool) {
	idx := strings.Index(imageURL, bucketMarker)
	if idx < 0 {
		return "", false
	}
	raw := imageURL[idx+len(bucketMarker):]
	if cut := strings.IndexAny(raw, "?#"); cut >= 0 {
		raw = raw[:cut]
	}
	decoded, err := url.PathUnescape(raw)
	if err != nil || decoded == "" {
		return "", false
	}
	return decoded, true
}

func main() {
	if err := run(); err != nil {
		slog.Error("migrate-images failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	databaseURL := os.Getenv("DATABASE_URL")
	publicBaseURL := os.Getenv("PUBLIC_BASE_URL")
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "/data"
	}
	if databaseURL == "" || publicBaseURL == "" {
		return fmt.Errorf("DATABASE_URL and PUBLIC_BASE_URL are required")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	disk := storage.NewDisk(dataDir, publicBaseURL)
	client := &http.Client{Timeout: 60 * time.Second}

	rows, err := pool.Query(ctx,
		`SELECT id, "imageUrl" FROM eaten_products WHERE "imageUrl" LIKE '%' || $1 || '%' ORDER BY id`,
		bucketMarker)
	if err != nil {
		return err
	}

	type item struct {
		id  int64
		url string
	}
	var items []item
	for rows.Next() {
		var it item
		if err := rows.Scan(&it.id, &it.url); err != nil {
			rows.Close()
			return err
		}
		items = append(items, it)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	slog.Info("found images to migrate", "count", len(items))

	failed := 0
	for i, it := range items {
		if err := migrateOne(ctx, pool, disk, client, it.id, it.url); err != nil {
			failed++
			slog.Error("failed to migrate image", "id", it.id, "url", it.url, "error", err)
			continue
		}
		slog.Info("migrated", "id", it.id, "progress", fmt.Sprintf("%d/%d", i+1, len(items)))
	}

	if failed > 0 {
		return fmt.Errorf("%d of %d images failed; rerun to retry", failed, len(items))
	}
	slog.Info("all images migrated")
	return nil
}

func migrateOne(ctx context.Context, pool *pgxpool.Pool, disk *storage.Disk, client *http.Client, id int64, imageURL string) error {
	objectPath, ok := extractBucketPath(imageURL)
	if !ok {
		return fmt.Errorf("not a supabase bucket URL")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, imageURL, nil)
	if err != nil {
		return err
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("download: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download: unexpected status %s", resp.Status)
	}

	data, err := io.ReadAll(io.LimitReader(resp.Body, 50<<20))
	if err != nil {
		return fmt.Errorf("download body: %w", err)
	}

	newURL, err := disk.Upload(ctx, objectPath, resp.Header.Get("Content-Type"), data)
	if err != nil {
		return err
	}

	tag, err := pool.Exec(ctx,
		`UPDATE eaten_products SET "imageUrl" = $1 WHERE id = $2 AND "imageUrl" = $3`,
		newURL, id, imageURL)
	if err != nil {
		return fmt.Errorf("update row: %w", err)
	}
	if tag.RowsAffected() == 0 {
		slog.Warn("row changed since scan, skipped", "id", id)
	}
	return nil
}
