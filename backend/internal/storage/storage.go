package storage

import "context"

// Storage uploads an image and returns its public URL. Files live on disk
// and are served by the Go API at {publicBaseURL}/images/{path}.
type Storage interface {
	Upload(ctx context.Context, path, contentType string, data []byte) (publicURL string, err error)
}
