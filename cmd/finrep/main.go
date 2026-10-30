// Command finrep is the personal finance ledger server.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/liorokman/finrep/internal/categorize"
	"github.com/liorokman/finrep/internal/conf"
	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/store"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "finrep:", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := conf.Load(os.Args[1:], conf.OSEnv(), os.Stderr)
	if err != nil {
		return err
	}
	level := map[string]slog.Level{"debug": slog.LevelDebug, "info": slog.LevelInfo, "warn": slog.LevelWarn, "error": slog.LevelError}[cfg.LogLevel]
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: level})))

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	st, err := store.Open(ctx, cfg.DBPath)
	if err != nil {
		return err
	}
	defer st.Close()

	led := ledger.New(st)
	if n, err := categorize.SeedOnce(ctx, st, led); err != nil {
		return fmt.Errorf("seed categories: %w", err)
	} else if n > 0 {
		slog.Info("seeded starter categories", "count", n)
	}

	if cfg.Mode == "mcp" {
		return errors.New("mcp stdio mode is not implemented yet")
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		pctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := st.PingContext(pctx); err != nil {
			http.Error(w, "database unavailable", http.StatusServiceUnavailable)
			return
		}
		fmt.Fprintln(w, "ok")
	})

	srv := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}
	errCh := make(chan error, 1)
	go func() { errCh <- srv.ListenAndServe() }()
	slog.Info("listening", "addr", cfg.Addr(), "auth", cfg.AuthEnabled, "db", cfg.DBPath)

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		slog.Info("shutting down")
		sctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return srv.Shutdown(sctx)
	}
}
