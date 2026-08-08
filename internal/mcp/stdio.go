package mcp

import (
	"log/slog"

	"github.com/mark3labs/mcp-go/server"
	"github.com/liorokman/finrep/internal/database"
)

// RunStdio starts the MCP server over stdio transport
func RunStdio(db *database.DB) error {
	slog.Info("Starting MCP Stdio Transport Server")
	mcpServer := InitMCPServer(db)
	return server.ServeStdio(mcpServer)
}
