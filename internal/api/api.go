// Package api serves the REST interface under /api/v1 (spec section 9.1).
package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/liorokman/finrep/internal/authn"
	"github.com/liorokman/finrep/internal/billing"
	"github.com/liorokman/finrep/internal/categorize"
	"github.com/liorokman/finrep/internal/conf"
	"github.com/liorokman/finrep/internal/importer"
	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/reports"
	"github.com/liorokman/finrep/internal/settings"
	"github.com/liorokman/finrep/internal/store"
)

// Deps are the services the API needs.
type Deps struct {
	Config     *conf.Config
	Store      *store.Store
	Ledger     *ledger.Ledger
	Importer   *importer.Importer
	Categorize *categorize.Service
	Billing    *billing.Service
	Reports    *reports.Service
	Settings   *settings.Store
	Sessions   *authn.Sessions // required when auth is on
	OIDC       *authn.OIDC     // required when auth is on
	Now        func() time.Time
}

// Server is the HTTP handler for the API.
type Server struct {
	d       Deps
	handler http.Handler
	staged  *stagingArea
}

func New(d Deps) (*Server, error) {
	if d.Config == nil || d.Store == nil || d.Ledger == nil {
		return nil, fmt.Errorf("api: config, store and ledger are required")
	}
	if d.Config.AuthEnabled && (d.Sessions == nil || d.OIDC == nil) {
		return nil, fmt.Errorf("api: auth is on but sessions or OIDC are missing")
	}
	if d.Now == nil {
		d.Now = time.Now
	}
	s := &Server{d: d, staged: newStagingArea(d.Now)}
	mux := http.NewServeMux()
	s.routes(mux)
	s.handler = s.recoverer(s.securityHeaders(s.logger(s.auth(mux))))
	return s, nil
}

// SecurityHeaders wraps another handler (e.g. the static UI) with the same response headers the API sets.
func (s *Server) SecurityHeaders(next http.Handler) http.Handler { return s.securityHeaders(next) }

// Handler returns the full handler, middleware included.
func (s *Server) Handler() http.Handler { return s.handler }

// ---- middleware ----

type ctxKey int

const (
	keyUser ctxKey = iota
	keySession
)

// userFrom returns the authenticated user ("local" when auth is off).
func userFrom(ctx context.Context) authn.User {
	u, _ := ctx.Value(keyUser).(authn.User)
	return u
}

func sessionFrom(ctx context.Context) *authn.Session {
	s, _ := ctx.Value(keySession).(*authn.Session)
	return s
}

var publicPaths = map[string]bool{
	"/healthz": true, "/auth/login": true, "/auth/callback": true, "/api/v1/auth/me": true,
}

func (s *Server) auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		info := authn.Inspect(r, s.d.Config.TrustedProxy)
		if !s.d.Config.AuthEnabled {
			if !authn.CheckCSRF(r, info.Host, nil) {
				writeError(w, http.StatusForbidden, "cross-origin request refused")
				return
			}
			ctx := context.WithValue(r.Context(), keyUser, authn.User{Subject: "local", Name: "Local user"})
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}
		sess, ok := s.d.Sessions.Load(w, r, info.Secure())
		if ok {
			ctx := context.WithValue(r.Context(), keyUser, sess.User)
			r = r.WithContext(context.WithValue(ctx, keySession, sess))
		}
		if publicPaths[r.URL.Path] {
			next.ServeHTTP(w, r)
			return
		}
		if !ok {
			writeError(w, http.StatusUnauthorized, "login required")
			return
		}
		if !authn.CheckCSRF(r, info.Host, sess) {
			writeError(w, http.StatusForbidden, "missing or invalid CSRF token")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "same-origin")
		h.Set("Cross-Origin-Opener-Policy", "same-origin")
		if len(r.URL.Path) >= 4 && r.URL.Path[:4] == "/api" || r.URL.Path == "/healthz" {
			h.Set("Cache-Control", "no-store")
		}
		if authn.Inspect(r, s.d.Config.TrustedProxy).Secure() {
			h.Set("Strict-Transport-Security", "max-age=31536000")
		}
		next.ServeHTTP(w, r)
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	if w.status == 0 {
		w.status = code
	}
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Write(b []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return w.ResponseWriter.Write(b)
}

func (w *statusWriter) Unwrap() http.ResponseWriter { return w.ResponseWriter }

func (s *Server) logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := authn.RandomToken(6)
		w.Header().Set("X-Request-Id", id)
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w}
		next.ServeHTTP(sw, r)
		slog.Info("request", "id", id, "method", r.Method, "path", r.URL.Path, "status", sw.status,
			"ms", time.Since(start).Milliseconds(), "ip", authn.Inspect(r, s.d.Config.TrustedProxy).ClientIP.String())
	})
}

func (s *Server) recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				if rec == http.ErrAbortHandler {
					panic(rec)
				}
				slog.Error("panic in handler", "path", r.URL.Path, "panic", rec, "stack", string(debug.Stack()))
				writeError(w, http.StatusInternalServerError, "internal error")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
