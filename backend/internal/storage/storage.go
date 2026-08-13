package storage

import "context"

// Storage uploads an image and returns its public URL. Phase 1 keeps files in
// Supabase Storage (existing imageUrl rows stay valid); Phase 3 swaps in a
// local-disk implementation behind this interface.
type Storage interface {
	Upload(ctx context.Context, path, contentType string, data []byte) (publicURL string, err error)
}
