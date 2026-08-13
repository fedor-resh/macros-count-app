package httpserver

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type Handlers struct {
	Auth          *AuthHandler
	EatenProducts *EatenProductsHandler
	Products      *ProductsHandler
	Users         *UsersHandler
	Photo         *PhotoHandler
	SSE           *SSEHandler
	Images        http.Handler
}

func NewRouter(verifier TokenVerifier, h Handlers, corsAllowedOrigins []string) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	if len(corsAllowedOrigins) > 0 {
		r.Use(corsMiddleware(corsAllowedOrigins))
	}

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	if h.Images != nil {
		r.Method(http.MethodGet, "/images/*", h.Images)
	}

	r.Route("/api/v1", func(r chi.Router) {
		if h.Auth != nil {
			r.Mount("/auth", h.Auth.Routes())
		}

		r.Group(func(r chi.Router) {
			r.Use(AuthMiddleware(verifier))

			r.Get("/eaten-products", h.EatenProducts.List)
			r.Post("/eaten-products", h.EatenProducts.Create)
			r.Patch("/eaten-products/{id}", h.EatenProducts.Update)
			r.Delete("/eaten-products/{id}", h.EatenProducts.Delete)

			r.Get("/products", h.Products.Search)

			r.Get("/me", h.Users.Me)
			r.Put("/me/goals", h.Users.UpsertGoals)
			r.Patch("/me", h.Users.UpdateParams)
			if h.Auth != nil {
				r.Post("/me/password", h.Auth.ChangePassword)
			}

			r.Post("/photos/analyze", h.Photo.Analyze)
			r.Get("/events", h.SSE.Stream)
		})
	})

	return r
}
