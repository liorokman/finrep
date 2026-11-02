package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/mark3labs/mcp-go/server"

	"github.com/liorokman/finrep/internal/api"
	"github.com/liorokman/finrep/internal/authn"
	"github.com/liorokman/finrep/internal/billing"
	"github.com/liorokman/finrep/internal/categorize"
	"github.com/liorokman/finrep/internal/conf"
	"github.com/liorokman/finrep/internal/importer"
	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/mcpsrv"
	"github.com/liorokman/finrep/internal/reports"
	"github.com/liorokman/finrep/internal/settings"
	"github.com/liorokman/finrep/internal/store"
	"github.com/liorokman/finrep/internal/webui"
)

// app is the assembled application.
type app struct {
	handler    http.Handler
	categorize *categorize.Service
}

// mcpServer builds the read-only MCP server over the same database.
func mcpServer(st *store.Store) *server.MCPServer {
	led := ledger.New(st)
	bill := billing.New(st, led)
	return mcpsrv.New(mcpsrv.Deps{Ledger: led, Billing: bill, Reports: reports.New(st, led, bill)})
}

// logged records each request to a handler that has no logging of its own.
func logged(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w}
		next.ServeHTTP(rec, r)
		slog.Info("request", "method", r.Method, "path", r.URL.Path, "status", rec.status, "ms", time.Since(start).Milliseconds())
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	if s.status == 0 {
		s.status = code
	}
	s.ResponseWriter.WriteHeader(code)
}

func (s *statusRecorder) Write(b []byte) (int, error) {
	if s.status == 0 {
		s.status = http.StatusOK
	}
	return s.ResponseWriter.Write(b)
}

func (s *statusRecorder) Unwrap() http.ResponseWriter { return s.ResponseWriter }

func (s *statusRecorder) Flush() {
	if f, ok := s.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// build wires the services together. With auth on it contacts the OIDC provider, so a wrong issuer
// fails at startup rather than at the first login.
func build(ctx context.Context, cfg *conf.Config, st *store.Store) (*app, error) {
	led := ledger.New(st)
	if n, err := categorize.SeedOnce(ctx, st, led); err != nil {
		return nil, fmt.Errorf("seed categories: %w", err)
	} else if n > 0 {
		slog.Info("seeded starter categories", "count", n)
	}
	if n, err := categorize.FillDescriptions(ctx, st, led); err != nil {
		return nil, fmt.Errorf("describe starter categories: %w", err)
	} else if n > 0 {
		slog.Info("added descriptions to starter categories", "count", n)
	}
	bill := billing.New(st, led)
	cat := categorize.New(st, led, categorize.Options{})
	if err := cat.Recover(ctx); err != nil {
		return nil, fmt.Errorf("recover categorization runs: %w", err)
	}
	deps := api.Deps{
		Config: cfg, Store: st, Ledger: led, Importer: importer.New(st, led), Categorize: cat, Billing: bill,
		Reports: reports.New(st, led, bill), Settings: settings.New(st),
	}
	if cfg.AuthEnabled {
		sessions, err := authn.NewSessions(cfg.SessionSecret)
		if err != nil {
			return nil, err
		}
		oidc, err := authn.NewOIDC(ctx, authn.OIDCConfig{
			Issuer: cfg.OIDCIssuer, ClientID: cfg.OIDCClientID, ClientSecret: cfg.OIDCSecret,
			RedirectURL: cfg.OIDCRedirect, TrustedProxies: cfg.TrustedProxy,
			RequiredGroup: cfg.OIDCGroup, GroupsClaim: cfg.OIDCGroupsClaim,
		}, sessions)
		if err != nil {
			return nil, err
		}
		deps.Sessions, deps.OIDC = sessions, oidc
	}
	if cfg.LocalAuth {
		// The signing key is the configured one, or one the application keeps in its database.
		secret := cfg.SessionSecret
		if len(secret) == 0 {
			var err error
			if secret, err = authn.SessionSecret(ctx, st.DB); err != nil {
				return nil, fmt.Errorf("session secret: %w", err)
			}
		}
		sessions, err := authn.NewSessions(secret)
		if err != nil {
			return nil, err
		}
		local := authn.NewLocal(st.DB)
		if setup, err := local.SetupRequired(ctx); err != nil {
			return nil, fmt.Errorf("read local user: %w", err)
		} else if setup {
			slog.Warn("no admin user yet: the first person to open the web interface will create it")
		}
		deps.Sessions, deps.Local = sessions, local
	}
	srv, err := api.New(deps)
	if err != nil {
		return nil, err
	}
	// /mcp is outside the session gate: agents authenticate with the static bearer token instead.
	mux := http.NewServeMux()
	mux.Handle("/mcp", logged(mcpsrv.HTTPHandler(mcpServer(st), cfg.MCPToken)))
	api := srv.Handler()
	for _, prefix := range []string{"/api/", "/auth/", "/healthz"} {
		mux.Handle(prefix, api)
	}
	mux.Handle("/", srv.SecurityHeaders(webui.Handler()))
	if cfg.MCPToken != "" {
		slog.Info("MCP over HTTP enabled", "path", "/mcp")
	}
	return &app{handler: mux, categorize: cat}, nil
}
