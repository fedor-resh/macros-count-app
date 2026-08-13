package analysis

import (
	"context"
	"log/slog"
	"math"
	"time"

	"github.com/fedor-resh/bite/backend/internal/events"
)

type Repo interface {
	UpdateAnalysis(ctx context.Context, id int64, userID, name string, kcalories, protein *int64, value *float64) error
	UpdateStatus(ctx context.Context, id int64, userID, status string) error
}

type LLM interface {
	Analyze(ctx context.Context, imageURL string) (FoodAnalysis, error)
}

// Service runs the photo analysis in the background — the Go analogue of the
// edge function's EdgeRuntime.waitUntil(runBackgroundAnalysis(...)).
type Service struct {
	repo    Repo
	llm     LLM
	broker  *events.Broker
	timeout time.Duration
}

func NewService(repo Repo, llm LLM, broker *events.Broker) *Service {
	return &Service{repo: repo, llm: llm, broker: broker, timeout: 120 * time.Second}
}

// Start kicks off background analysis. imageRef is what the LLM receives as
// image_url — a base64 data-URL of the uploaded bytes, so the stored file
// does not have to be publicly reachable.
func (s *Service) Start(id int64, userID, imageRef string) {
	go s.run(id, userID, imageRef)
}

func (s *Service) run(id int64, userID, imageRef string) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("photo analysis panicked", "id", id, "panic", r)
		}
	}()

	// Detached from the request context: the HTTP response is already sent.
	ctx, cancel := context.WithTimeout(context.Background(), s.timeout)
	defer cancel()

	result, err := s.llm.Analyze(ctx, imageRef)
	if err != nil {
		slog.Error("photo analysis failed", "id", id, "error", err)
		s.markError(ctx, id, userID)
		return
	}

	name := result.FoodName
	if name == "" {
		name = "Продукт"
	}
	if err := s.repo.UpdateAnalysis(ctx, id, userID, name,
		roundToInt(result.Calories), roundToInt(result.Protein), roundValue(result.Weight)); err != nil {
		slog.Error("failed to store analysis result", "id", id, "error", err)
		s.markError(ctx, id, userID)
		return
	}

	s.broker.Publish(userID, events.Event{ID: id, Status: "completed", Name: name})
}

func (s *Service) markError(ctx context.Context, id int64, userID string) {
	if err := s.repo.UpdateStatus(ctx, id, userID, "error"); err != nil {
		slog.Error("failed to update status to error", "id", id, "error", err)
	}
	s.broker.Publish(userID, events.Event{ID: id, Status: "error"})
}

func roundToInt(v *float64) *int64 {
	if v == nil {
		return nil
	}
	rounded := int64(math.Round(*v))
	return &rounded
}

func roundValue(v *float64) *float64 {
	if v == nil {
		return nil
	}
	rounded := math.Round(*v)
	return &rounded
}
