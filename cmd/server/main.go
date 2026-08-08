package main

import (
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/liorokman/finrep/internal/auth"
	"github.com/liorokman/finrep/internal/config"
	"github.com/liorokman/finrep/internal/database"
	"github.com/liorokman/finrep/internal/handlers"
	"github.com/liorokman/finrep/internal/logger"
	"github.com/liorokman/finrep/internal/mcp"
)

//go:embed all:public
var publicFS embed.FS

func main() {
	cfg := config.LoadConfig()
	l := logger.InitLogger(cfg.LogLevel)

	l.Info("Starting Financial Reporting Application",
		"mode", cfg.Mode,
		"port", cfg.Port,
		"log_level", cfg.LogLevel,
		"db_path", cfg.DBPath,
		"oidc_enabled", cfg.OIDCEnabled,
	)

	// Initialize SQLite Database
	sqlDB, err := database.InitDB(cfg.DBPath)
	if err != nil {
		l.Error("Failed to initialize database", "error", err)
		os.Exit(1)
	}
	defer sqlDB.Close()

	db := database.New(sqlDB)

	// Stdio MCP Mode
	if cfg.Mode == "mcp" {
		if err := mcp.RunStdio(db); err != nil {
			l.Error("MCP Stdio server error", "error", err)
			os.Exit(1)
		}
		return
	}

	// Web Mode (Echo Router)
	e := echo.New()
	e.HideBanner = true

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.GzipWithConfig(middleware.GzipConfig{
		Skipper: func(c echo.Context) bool {
			// Skip gzip compression on /mcp/ paths to allow unbuffered SSE streaming
			p := c.Path()
			return len(p) >= 5 && p[:5] == "/mcp/"
		},
	}))
	e.Use(auth.AuthMiddleware(cfg))

	// Register API REST Handlers
	h := handlers.New(db, cfg)
	h.RegisterRoutes(e)

	// Register MCP SSE Transport
	mcp.RegisterSSERoutes(e, db)

	// Serve Static Frontend Assets (Vite Spa)
	staticFS, err := fs.Sub(publicFS, "public")
	if err == nil {
		assetHandler := http.FileServer(http.FS(staticFS))
		e.GET("/*", echo.WrapHandler(assetHandler))
	} else {
		// Fallback for local development when public/ isn't embedded yet
		e.GET("/", func(c echo.Context) error {
			return c.String(http.StatusOK, "Financial Reporting API Server Running. (Build UI with 'task build-ui')")
		})
	}

	// Start HTTP Server
	addr := fmt.Sprintf(":%d", cfg.Port)
	l.Info("Web Server listening", "addr", addr)
	if err := e.Start(addr); err != nil && err != http.ErrServerClosed {
		l.Error("Server shutdown error", "error", err)
	}
}
