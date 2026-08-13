package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/fedor-resh/macros-count-app/backend/internal/analysis"
	"github.com/fedor-resh/macros-count-app/backend/internal/auth"
	"github.com/fedor-resh/macros-count-app/backend/internal/config"
	"github.com/fedor-resh/macros-count-app/backend/internal/events"
	"github.com/fedor-resh/macros-count-app/backend/internal/httpserver"
	"github.com/fedor-resh/macros-count-app/backend/internal/repo"
	"github.com/fedor-resh/macros-count-app/backend/internal/storage"
	"github.com/fedor-resh/macros-count-app/backend/migrations"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func main() {
	if err := run(); err != nil {
		slog.Error("server exited with error", "error", err)
		os.Exit(1)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	// AUTO_MIGRATE применяет goose-миграции на старте. Включать только для
	// собственного Postgres — против Supabase-БД это не должно запускаться.
	if cfg.AutoMigrate {
		if err := runMigrations(ctx, cfg.DatabaseURL); err != nil {
			return fmt.Errorf("apply migrations: %w", err)
		}
	}

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		return err
	}

	verifier, err := auth.NewVerifier(ctx, cfg.SupabaseURL, cfg.AuthJWKSURL, cfg.SupabaseJWTSecret)
	if err != nil {
		return err
	}

	broker := events.NewBroker()
	eatenProducts := repo.NewEatenProducts(pool)
	llm := analysis.NewOpenRouterClient(cfg.OpenRouterAPIKey, cfg.SiteURL, cfg.SiteName)
	analysisService := analysis.NewService(eatenProducts, llm, broker)

	var store storage.Storage
	var imagesHandler http.Handler
	switch cfg.StorageDriver {
	case config.StorageDriverDisk:
		disk := storage.NewDisk(cfg.DataDir, cfg.PublicBaseURL)
		store = disk
		imagesHandler = httpserver.ImagesHandler(disk.Root())
	default:
		store = storage.NewSupabase(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey)
	}

	router := httpserver.NewRouter(verifier, httpserver.Handlers{
		EatenProducts: httpserver.NewEatenProductsHandler(eatenProducts),
		Products:      httpserver.NewProductsHandler(repo.NewProducts(pool)),
		Users:         httpserver.NewUsersHandler(repo.NewUsers(pool)),
		Photo:         httpserver.NewPhotoHandler(store, eatenProducts, analysisService),
		SSE:           httpserver.NewSSEHandler(broker),
		Images:        imagesHandler,
	}, cfg.CORSAllowedOrigins)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		// No WriteTimeout: SSE streams stay open indefinitely.
	}

	errCh := make(chan error, 1)
	go func() {
		slog.Info("server listening", "addr", server.Addr, "storage", cfg.StorageDriver)
		errCh <- server.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
	}

	slog.Info("shutting down")
	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()
	if err := server.Shutdown(shutdownCtx); err != nil {
		// Open SSE streams block graceful shutdown; force-close them.
		return errors.Join(err, server.Close())
	}
	return nil
}

func runMigrations(ctx context.Context, databaseURL string) error {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return err
	}
	defer db.Close()

	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	return goose.UpContext(ctx, db, ".")
}
