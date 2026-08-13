package events

import "sync"

// Event is pushed to the owning user's SSE stream when a photo analysis
// finishes, replacing the Supabase Realtime subscription on eaten_products.
type Event struct {
	ID     int64  `json:"id"`
	Status string `json:"status"`
	Name   string `json:"name"`
}

// Broker is an in-process pub/sub keyed by user id. Correct for a single
// instance; swap the internals for Postgres LISTEN/NOTIFY if replicas appear.
type Broker struct {
	mu   sync.RWMutex
	subs map[string]map[chan Event]struct{}
}

func NewBroker() *Broker {
	return &Broker{subs: make(map[string]map[chan Event]struct{})}
}

func (b *Broker) Subscribe(userID string) (<-chan Event, func()) {
	ch := make(chan Event, 8)

	b.mu.Lock()
	if b.subs[userID] == nil {
		b.subs[userID] = make(map[chan Event]struct{})
	}
	b.subs[userID][ch] = struct{}{}
	b.mu.Unlock()

	unsubscribe := func() {
		b.mu.Lock()
		if set := b.subs[userID]; set != nil {
			delete(set, ch)
			if len(set) == 0 {
				delete(b.subs, userID)
			}
		}
		b.mu.Unlock()
	}
	return ch, unsubscribe
}

// Publish never blocks: a full subscriber buffer drops the event — the client
// re-syncs by invalidating queries on SSE reconnect anyway.
func (b *Broker) Publish(userID string, e Event) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	for ch := range b.subs[userID] {
		select {
		case ch <- e:
		default:
		}
	}
}
