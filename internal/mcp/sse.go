package mcp

import (
	"github.com/labstack/echo/v4"
	"github.com/mark3labs/mcp-go/server"
	"github.com/liorokman/finrep/internal/database"
)

// RegisterSSERoutes mounts MCP HTTP SSE transport on Echo router
func RegisterSSERoutes(e *echo.Echo, db *database.DB) *server.SSEServer {
	mcpServer := InitMCPServer(db)
	sseServer := server.NewSSEServer(mcpServer)

	// Mount SSEServer HTTP handler on /mcp/sse and /mcp/messages
	handler := echo.WrapHandler(sseServer)
	e.GET("/mcp/sse", handler)
	e.POST("/mcp/messages", handler)

	return sseServer
}
