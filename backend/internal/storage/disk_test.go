package storage

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestDisk_UploadWritesFileAndReturnsURL(t *testing.T) {
	dir := t.TempDir()
	d := NewDisk(dir, "https://example.com/")

	url, err := d.Upload(context.Background(), "user-1/photo-123.jpg", "image/jpeg", []byte("fake-image"))
	if err != nil {
		t.Fatal(err)
	}
	if url != "https://example.com/images/user-1/photo-123.jpg" {
		t.Fatalf("unexpected URL: %s", url)
	}

	data, err := os.ReadFile(filepath.Join(dir, "images", "user-1", "photo-123.jpg"))
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "fake-image" {
		t.Fatalf("unexpected file content: %s", data)
	}
}

func TestDisk_UploadRejectsTraversal(t *testing.T) {
	dir := t.TempDir()
	d := NewDisk(dir, "https://example.com")

	traversals := []string{
		"../evil.jpg",
		"..\\evil.jpg",
		"user-1/../../evil.jpg",
		"user-1/../user-2/photo.jpg",
		"",
		".",
	}
	for _, p := range traversals {
		if _, err := d.Upload(context.Background(), p, "image/jpeg", []byte("x")); err == nil {
			t.Fatalf("expected error for path %q", p)
		}
	}
}
