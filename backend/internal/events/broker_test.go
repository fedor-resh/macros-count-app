package events

import "testing"

func TestBroker_PublishReachesOwnUserOnly(t *testing.T) {
	b := NewBroker()

	chA, unsubA := b.Subscribe("user-a")
	defer unsubA()
	chB, unsubB := b.Subscribe("user-b")
	defer unsubB()

	b.Publish("user-a", Event{ID: 1, Status: "completed", Name: "Борщ"})

	select {
	case e := <-chA:
		if e.ID != 1 || e.Status != "completed" {
			t.Fatalf("unexpected event: %+v", e)
		}
	default:
		t.Fatal("subscriber of user-a did not receive the event")
	}

	select {
	case e := <-chB:
		t.Fatalf("user-b must not receive user-a events, got %+v", e)
	default:
	}
}

func TestBroker_UnsubscribeStopsDelivery(t *testing.T) {
	b := NewBroker()
	ch, unsubscribe := b.Subscribe("user-a")
	unsubscribe()

	b.Publish("user-a", Event{ID: 2, Status: "error"})

	select {
	case e := <-ch:
		t.Fatalf("unsubscribed channel received event: %+v", e)
	default:
	}
}

func TestBroker_PublishDoesNotBlockOnFullBuffer(t *testing.T) {
	b := NewBroker()
	_, unsubscribe := b.Subscribe("user-a")
	defer unsubscribe()

	// Больше, чем ёмкость буфера: Publish обязан не блокироваться.
	for i := range 100 {
		b.Publish("user-a", Event{ID: int64(i), Status: "completed"})
	}
}
