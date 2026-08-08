package mcp

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/liorokman/finrep/internal/database"
)

// InitMCPServer initializes MCP server with financial tools
func InitMCPServer(db *database.DB) *server.MCPServer {
	s := server.NewMCPServer(
		"finrep",
		"1.0.0",
		server.WithLogging(),
	)

	// Tool 1: list_accounts
	listAccountsTool := mcp.NewTool(
		"list_accounts",
		mcp.WithDescription("List all bank accounts and credit cards with current calculated balances"),
	)
	s.AddTool(listAccountsTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		accounts, err := db.GetAccounts()
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Failed to fetch accounts: %v", err)), nil
		}
		data, _ := json.MarshalIndent(accounts, "", "  ")
		return mcp.NewToolResultText(string(data)), nil
	})

	// Tool 2: get_account_summary
	accountSummaryTool := mcp.NewTool(
		"get_account_summary",
		mcp.WithDescription("Get detailed summary of a specific account by ID"),
		mcp.WithString("account_id", mcp.Required(), mcp.Description("The UUID of the account")),
	)
	s.AddTool(accountSummaryTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		accID := getStringArg(request, "account_id", "")
		if accID == "" {
			return mcp.NewToolResultError("account_id parameter is required"), nil
		}
		acc, err := db.GetAccountByID(accID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Account not found: %v", err)), nil
		}
		data, _ := json.MarshalIndent(acc, "", "  ")
		return mcp.NewToolResultText(string(data)), nil
	})

	// Tool 3: query_transactions
	queryTxTool := mcp.NewTool(
		"query_transactions",
		mcp.WithDescription("Query transactions with optional filters for search, date range, unreviewed, or account"),
		mcp.WithString("search", mcp.Description("Search term for payee or notes")),
		mcp.WithString("account_id", mcp.Description("Filter by account ID")),
		mcp.WithString("start_date", mcp.Description("Start date YYYY-MM-DD")),
		mcp.WithString("end_date", mcp.Description("End date YYYY-MM-DD")),
		mcp.WithNumber("limit", mcp.Description("Max items to return (default 50)")),
	)
	s.AddTool(queryTxTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		filter := database.TransactionFilter{
			AccountID: getStringArg(request, "account_id", ""),
			Search:    getStringArg(request, "search", ""),
			StartDate: getStringArg(request, "start_date", ""),
			EndDate:   getStringArg(request, "end_date", ""),
			Limit:     getIntArg(request, "limit", 50),
		}
		txs, total, err := db.QueryTransactions(filter)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Query failed: %v", err)), nil
		}

		result := map[string]interface{}{
			"total":        total,
			"transactions": txs,
		}
		data, _ := json.MarshalIndent(result, "", "  ")
		return mcp.NewToolResultText(string(data)), nil
	})

	// Tool 4: get_category_breakdown
	catBreakdownTool := mcp.NewTool(
		"get_category_breakdown",
		mcp.WithDescription("Get category spending breakdown for a given date range"),
		mcp.WithString("start_date", mcp.Description("Start date YYYY-MM-DD")),
		mcp.WithString("end_date", mcp.Description("End date YYYY-MM-DD")),
	)
	s.AddTool(catBreakdownTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		categories, err := db.GetCategories()
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Failed to get categories: %v", err)), nil
		}
		data, _ := json.MarshalIndent(categories, "", "  ")
		return mcp.NewToolResultText(string(data)), nil
	})

	return s
}

func getStringArg(req mcp.CallToolRequest, key, defaultVal string) string {
	if req.Params.Arguments != nil {
		if argsMap, ok := req.Params.Arguments.(map[string]any); ok {
			if val, ok := argsMap[key]; ok {
				if s, ok := val.(string); ok {
					return s
				}
			}
		}
	}
	return defaultVal
}

func getIntArg(req mcp.CallToolRequest, key string, defaultVal int) int {
	if req.Params.Arguments != nil {
		if argsMap, ok := req.Params.Arguments.(map[string]any); ok {
			if val, ok := argsMap[key]; ok {
				switch v := val.(type) {
				case float64:
					return int(v)
				case int:
					return v
				}
			}
		}
	}
	return defaultVal
}
