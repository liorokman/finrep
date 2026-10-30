// Command finrep is the personal finance ledger server.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/liorokman/finrep/internal/conf"
	"github.com/liorokman/finrep/internal/mcpsrv"
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

	if cfg.Mode == "mcp" {
		// Stdout carries the protocol, so everything else (logs included) goes to stderr.
		slog.Info("serving MCP on stdio", "db", cfg.DBPath)
		return mcpsrv.ServeStdio(ctx, mcpServer(st))
	}

	a, err := build(ctx, cfg, st)
	if err != nil {
		return err
	}
	srv := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           a.handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       2 * time.Minute, // uploads are capped by --max-upload-mb
		WriteTimeout:      2 * time.Minute,
		IdleTimeout:       2 * time.Minute,
		MaxHeaderBytes:    64 << 10,
	}
	errCh := make(chan error, 1)
	go func() { errCh <- srv.ListenAndServe() }()
	slog.Info("listening", "addr", cfg.Addr(), "auth", cfg.AuthEnabled, "db", cfg.DBPath)

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		slog.Info("shutting down")
		a.categorize.Cancel() // batches already applied stay; the run is marked canceled
		sctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return srv.Shutdown(sctx)
	}
}
