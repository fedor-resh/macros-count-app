package httpserver

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/fedor-resh/bite/backend/internal/events"
)

type SSEHandler struct {
	broker *events.Broker
}

func NewSSEHandler(b *events.Broker) *SSEHandler {
	return &SSEHandler{broker: b}
}

// Stream sends photo-analysis events to the authenticated user over SSE,
// replacing the Supabase Realtime subscription.
func (h *SSEHandler) Stream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming unsupported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	// Disable proxy buffering (nginx and friends); Caddy streams by default.
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	ch, unsubscribe := h.broker.Subscribe(UserID(r.Context()))
	defer unsubscribe()

	// Periodic comments keep idle connections from being closed by proxies.
	ping := time.NewTicker(25 * time.Second)
	defer ping.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ping.C:
			fmt.Fprint(w, ": ping\n\n")
			flusher.Flush()
		case event := <-ch:
			data, err := json.Marshal(event)
			if err != nil {
				continue
			}
			fmt.Fprintf(w, "event: analysis\ndata: %s\n\n", data)
			flusher.Flush()
		}
	}
}
