package main

import "testing"

func TestExtractBucketPath(t *testing.T) {
	cases := []struct {
		name   string
		url    string
		want   string
		wantOK bool
	}{
		{
			name:   "обычный supabase public URL",
			url:    "https://gwhqshlpglptxsexagcz.supabase.co/storage/v1/object/public/images/user-1/photo-123.jpg",
			want:   "user-1/photo-123.jpg",
			wantOK: true,
		},
		{
			name:   "URL с query-параметрами",
			url:    "https://x.supabase.co/storage/v1/object/public/images/u/photo.webp?width=200",
			want:   "u/photo.webp",
			wantOK: true,
		},
		{
			name:   "percent-encoded путь декодируется",
			url:    "https://x.supabase.co/storage/v1/object/public/images/u/photo%201.jpg",
			want:   "u/photo 1.jpg",
			wantOK: true,
		},
		{
			name:   "уже мигрированный URL не матчится",
			url:    "https://my.domain.com/images/user-1/photo-123.jpg",
			wantOK: false,
		},
		{
			name:   "другой бакет не матчится",
			url:    "https://x.supabase.co/storage/v1/object/public/avatars/u/a.jpg",
			wantOK: false,
		},
		{
			name:   "пустой хвост",
			url:    "https://x.supabase.co/storage/v1/object/public/images/",
			wantOK: false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := extractBucketPath(tc.url)
			if ok != tc.wantOK {
				t.Fatalf("ok: expected %v, got %v", tc.wantOK, ok)
			}
			if ok && got != tc.want {
				t.Fatalf("path: expected %q, got %q", tc.want, got)
			}
		})
	}
}
