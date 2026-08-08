package handlers

import (
	"io"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"github.com/liorokman/finrep/internal/auth"
	"github.com/liorokman/finrep/internal/config"
	"github.com/liorokman/finrep/internal/database"
	"github.com/liorokman/finrep/internal/localai"
	"github.com/liorokman/finrep/internal/models"
	"github.com/liorokman/finrep/internal/parser"
	"github.com/liorokman/finrep/internal/services"
)

type Handler struct {
	db        *database.DB
	cfg       *config.Config
	localAI   *localai.LocalAIService
	reconSvc  *services.ReconciliationService
	reportSvc *services.ReportService
}

func New(db *database.DB, cfg *config.Config) *Handler {
	return &Handler{
		db:        db,
		cfg:       cfg,
		localAI:   localai.New(db),
		reconSvc:  services.NewReconciliationService(db),
		reportSvc: services.NewReportService(db),
	}
}

// RegisterRoutes registers all API routes on Echo instance
func (h *Handler) RegisterRoutes(e *echo.Echo) {
	// Root OIDC Auth endpoints for browser redirects
	e.GET("/auth/login", auth.HandleLogin(h.cfg))
	e.GET("/auth/callback", auth.HandleCallback(h.cfg))
	e.GET("/auth/logout", auth.HandleLogout())

	api := e.Group("/api/v1")

	// Auth Info & Auth endpoints
	api.GET("/auth/info", h.GetAuthInfo)
	api.GET("/auth/login", auth.HandleLogin(h.cfg))
	api.GET("/auth/callback", auth.HandleCallback(h.cfg))
	api.GET("/auth/logout", auth.HandleLogout())

	// Accounts
	api.GET("/accounts", h.GetAccounts)
	api.POST("/accounts", h.CreateAccount)
	api.GET("/accounts/:id", h.GetAccountByID)
	api.DELETE("/accounts/:id", h.DeleteAccount)

	// Categories
	api.GET("/categories", h.GetCategories)
	api.POST("/categories", h.CreateCategory)
	api.POST("/categories/accept-suggestion", h.AcceptCategorySuggestion)
	api.POST("/categories/reject-suggestion", h.RejectCategorySuggestion)

	// Transactions
	api.GET("/transactions", h.QueryTransactions)
	api.POST("/transactions", h.CreateTransaction)
	api.PUT("/transactions/:id/category", h.UpdateTransactionCategory)
	api.DELETE("/transactions/:id", h.DeleteTransaction)

	// CSV Import & LocalAI
	api.POST("/import", h.ImportCSV)
	api.POST("/import/inspect", h.InspectCSV)
	api.POST("/import/stage", h.StageCSV)
	api.POST("/import/commit", h.CommitCSV)
	api.POST("/categorize/localai", h.CategorizeLocalAI)

	// Reconciliation
	api.GET("/reconciliation/candidates", h.GetReconciliationCandidates)
	api.POST("/reconciliation/link", h.ReconcileLumpSum)

	// Reports
	api.GET("/reports/net-worth", h.GetNetWorthReport)
	api.GET("/reports/cash-flow", h.GetCashFlowReport)
	api.GET("/reports/category-donut", h.GetCategoryDonutReport)
	api.GET("/reports/budget-vs-actual", h.GetBudgetVsActualReport)
	api.GET("/reports/subscriptions", h.GetSubscriptionsReport)
	api.GET("/reports/cc-payoff", h.GetCCPayoffReport)
	api.GET("/reports/foreign-currency", h.GetForeignCurrencyReport)
	api.GET("/reports/anomalies", h.GetAnomaliesReport)
	api.GET("/reports/sankey", h.GetSankeyReport)
	api.GET("/reports/mom-heatmap", h.GetMoMHeatmapReport)

	// Category CRUD
	api.PUT("/categories/:id", h.UpdateCategory)
	api.DELETE("/categories/:id", h.DeleteCategory)

	// Settings
	api.GET("/settings", h.GetSettings)
	api.POST("/settings", h.UpdateSettings)
}

func (h *Handler) GetAuthInfo(c echo.Context) error {
	user := auth.GetUser(c)
	return c.JSON(http.StatusOK, map[string]interface{}{
		"oidc_enabled":   h.cfg.OIDCEnabled,
		"oidc_issuer":    h.cfg.OIDCIssuer,
		"oidc_client_id": h.cfg.OIDCClientID,
		"redirect_url":   h.cfg.OIDCRedirect,
		"user":           user,
	})
}

func (h *Handler) GetAccounts(c echo.Context) error {
	accounts, err := h.db.GetAccounts()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, accounts)
}

func (h *Handler) CreateAccount(c echo.Context) error {
	var acc models.Account
	if err := c.Bind(&acc); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid payload"})
	}
	if err := h.db.CreateAccount(&acc); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, acc)
}

func (h *Handler) GetAccountByID(c echo.Context) error {
	id := c.Param("id")
	acc, err := h.db.GetAccountByID(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Account not found"})
	}
	return c.JSON(http.StatusOK, acc)
}

func (h *Handler) DeleteAccount(c echo.Context) error {
	id := c.Param("id")
	if err := h.db.DeleteAccount(id); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) GetCategories(c echo.Context) error {
	cats, err := h.db.GetCategories()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, cats)
}

func (h *Handler) CreateCategory(c echo.Context) error {
	var cat models.Category
	if err := c.Bind(&cat); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid payload"})
	}
	if err := h.db.CreateCategory(&cat); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, cat)
}

type AcceptSuggestionRequest struct {
	TransactionID string `json:"transaction_id"`
}

func (h *Handler) AcceptCategorySuggestion(c echo.Context) error {
	var req AcceptSuggestionRequest
	if err := c.Bind(&req); err != nil || req.TransactionID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "transaction_id is required"})
	}
	cat, err := h.db.AcceptCategorySuggestion(req.TransactionID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, cat)
}

type RejectSuggestionRequest struct {
	TransactionID      string  `json:"transaction_id"`
	FallbackCategoryID *string `json:"fallback_category_id,omitempty"`
}

func (h *Handler) RejectCategorySuggestion(c echo.Context) error {
	var req RejectSuggestionRequest
	if err := c.Bind(&req); err != nil || req.TransactionID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "transaction_id is required"})
	}
	if err := h.db.RejectCategorySuggestion(req.TransactionID, req.FallbackCategoryID); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"status": "success"})
}

func (h *Handler) QueryTransactions(c echo.Context) error {
	var unreviewed *bool
	if unrevStr := c.QueryParam("unreviewed"); unrevStr != "" {
		b := unrevStr == "true" || unrevStr == "1"
		unreviewed = &b
	}

	limit := 50
	if l := c.QueryParam("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil {
			limit = val
		}
	}

	filter := database.TransactionFilter{
		AccountID:  c.QueryParam("account_id"),
		CategoryID: c.QueryParam("category_id"),
		Unreviewed: unreviewed,
		Search:     c.QueryParam("search"),
		StartDate:  c.QueryParam("start_date"),
		EndDate:    c.QueryParam("end_date"),
		Limit:      limit,
	}

	txs, total, err := h.db.QueryTransactions(filter)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"total":        total,
		"transactions": txs,
	})
}

func (h *Handler) CreateTransaction(c echo.Context) error {
	var tx models.Transaction
	if err := c.Bind(&tx); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid payload"})
	}

	if tx.ImportHash == "" {
		ord, err := h.db.GetDailyOccurrenceOrdinal(tx.AccountID, tx.Date, tx.Amount, tx.PayeeRaw)
		if err != nil {
			ord = 1
		}
		tx.ImportHash = database.GenerateImportHash(tx.AccountID, tx.Date, tx.Amount, tx.PayeeRaw, ord)
	}

	if err := h.db.CreateTransaction(&tx); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, tx)
}

type UpdateCategoryRequest struct {
	CategoryID    *string              `json:"category_id"`
	IsReviewed    bool                 `json:"is_reviewed"`
	CategorizedBy models.CategorizedBy `json:"categorized_by"`
}

func (h *Handler) UpdateTransactionCategory(c echo.Context) error {
	id := c.Param("id")
	var req UpdateCategoryRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid payload"})
	}
	if req.CategorizedBy == "" {
		req.CategorizedBy = models.CategorizedByManual
	}
	if err := h.db.UpdateTransactionCategory(id, req.CategoryID, req.IsReviewed, req.CategorizedBy); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) DeleteTransaction(c echo.Context) error {
	id := c.Param("id")
	if err := h.db.DeleteTransaction(id); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) ImportCSV(c echo.Context) error {
	accountID := c.FormValue("account_id")
	if accountID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "account_id is required"})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "CSV file is required"})
	}

	src, err := file.Open()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	defer src.Close()

	data, err := io.ReadAll(src)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	preset := &models.ImportPreset{
		DateColumn:  c.FormValue("date_column"),
		PayeeColumn: c.FormValue("payee_column"),
		HasHeader:   c.FormValue("has_header") != "false",
	}
	if debitCol := c.FormValue("debit_column"); debitCol != "" {
		preset.DebitColumn = &debitCol
	}
	if creditCol := c.FormValue("credit_column"); creditCol != "" {
		preset.CreditColumn = &creditCol
	}
	if amountCol := c.FormValue("amount_column"); amountCol != "" {
		preset.AmountColumn = &amountCol
	}

	p := parser.NewCSVParser(h.db)
	txs, duplicates, err := p.ParseCSV(accountID, data, preset)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	imported := 0
	for _, tx := range txs {
		if err := h.db.CreateTransaction(&tx); err == nil {
			imported++
		} else {
			duplicates++
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"imported":   imported,
		"duplicates": duplicates,
		"total":      len(txs),
	})
}

func (h *Handler) InspectCSV(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "CSV file is required"})
	}
	src, err := file.Open()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	defer src.Close()

	data, err := io.ReadAll(src)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	p := parser.NewCSVParser(h.db)
	res, err := p.InspectCSV(data)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, res)
}

func (h *Handler) StageCSV(c echo.Context) error {
	accountID := c.FormValue("account_id")
	if accountID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "account_id is required"})
	}
	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "CSV file is required"})
	}
	src, err := file.Open()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	defer src.Close()

	data, err := io.ReadAll(src)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	preset := &models.ImportPreset{
		DateColumn:  c.FormValue("date_column"),
		PayeeColumn: c.FormValue("payee_column"),
		HasHeader:   c.FormValue("has_header") != "false",
	}
	if debitCol := c.FormValue("debit_column"); debitCol != "" {
		preset.DebitColumn = &debitCol
	}
	if creditCol := c.FormValue("credit_column"); creditCol != "" {
		preset.CreditColumn = &creditCol
	}
	if amountCol := c.FormValue("amount_column"); amountCol != "" {
		preset.AmountColumn = &amountCol
	}

	p := parser.NewCSVParser(h.db)
	res, err := p.StageCSV(accountID, data, preset)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, res)
}

func (h *Handler) CommitCSV(c echo.Context) error {
	var payload struct {
		Transactions []models.Transaction `json:"transactions"`
	}
	if err := c.Bind(&payload); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid payload"})
	}

	imported := 0
	duplicates := 0
	for _, tx := range payload.Transactions {
		if err := h.db.CreateTransaction(&tx); err == nil {
			imported++
		} else {
			duplicates++
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"imported":   imported,
		"duplicates": duplicates,
		"total":      len(payload.Transactions),
	})
}

func (h *Handler) CategorizeLocalAI(c echo.Context) error {
	unreviewed := true
	txs, _, err := h.db.QueryTransactions(database.TransactionFilter{
		Unreviewed: &unreviewed,
		Limit:      50,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	if len(txs) == 0 {
		return c.JSON(http.StatusOK, map[string]string{"status": "No unreviewed transactions to categorize"})
	}

	if err := h.localAI.CategorizeBatch(c.Request().Context(), txs); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status":     "Batch categorization complete",
		"processed": len(txs),
	})
}

func (h *Handler) GetReconciliationCandidates(c echo.Context) error {
	bankTxID := c.QueryParam("bank_transaction_id")
	if bankTxID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "bank_transaction_id is required"})
	}
	res, err := h.reconSvc.FindReconciliationCandidates(bankTxID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

type ReconcileLinkRequest struct {
	BankTransactionID       string   `json:"bank_transaction_id"`
	CreditCardTransactionIDs []string `json:"credit_card_transaction_ids"`
}

func (h *Handler) ReconcileLumpSum(c echo.Context) error {
	var req ReconcileLinkRequest
	if err := c.Bind(&req); err != nil || req.BankTransactionID == "" || len(req.CreditCardTransactionIDs) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid bank or CC transaction IDs"})
	}

	if err := h.reconSvc.ReconcileLumpSum(req.BankTransactionID, req.CreditCardTransactionIDs); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "reconciled"})
}

func (h *Handler) GetNetWorthReport(c echo.Context) error {
	res, err := h.reportSvc.GetNetWorthTrend()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) GetCashFlowReport(c echo.Context) error {
	res, err := h.reportSvc.GetCashFlowSummary()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) GetCategoryDonutReport(c echo.Context) error {
	res, err := h.reportSvc.GetCategoryDonut()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) GetBudgetVsActualReport(c echo.Context) error {
	res, err := h.reportSvc.GetBudgetVsActual()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) GetSubscriptionsReport(c echo.Context) error {
	res, err := h.reportSvc.GetSubscriptions()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) GetCCPayoffReport(c echo.Context) error {
	res, err := h.reportSvc.GetCCPayoffForecast()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) GetForeignCurrencyReport(c echo.Context) error {
	res, err := h.reportSvc.GetForeignCurrencyReport()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) GetAnomaliesReport(c echo.Context) error {
	res, err := h.reportSvc.GetAnomalies()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) GetSettings(c echo.Context) error {
	settings, err := h.db.GetAllSettings()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, settings)
}

func (h *Handler) UpdateSettings(c echo.Context) error {
	var payload map[string]string
	if err := c.Bind(&payload); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid payload"})
	}
	for k, v := range payload {
		if err := h.db.SetSetting(k, v); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}
	}
	return c.JSON(http.StatusOK, map[string]string{"status": "saved"})
}

func (h *Handler) UpdateCategory(c echo.Context) error {
	id := c.Param("id")
	var cat models.Category
	if err := c.Bind(&cat); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid payload"})
	}
	if err := h.db.UpdateCategory(id, &cat); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) DeleteCategory(c echo.Context) error {
	id := c.Param("id")
	if err := h.db.DeleteCategory(id); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) GetSankeyReport(c echo.Context) error {
	res, err := h.reportSvc.GetSankeyFlow()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	if res == nil {
		res = []services.SankeyLink{}
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) GetMoMHeatmapReport(c echo.Context) error {
	res, err := h.reportSvc.GetMoMHeatmap()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	if res == nil {
		res = []services.MoMRow{}
	}
	return c.JSON(http.StatusOK, res)
}
