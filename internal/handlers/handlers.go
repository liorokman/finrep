package handlers

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

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
	db         *database.DB
	cfg        *config.Config
	localAI    *localai.LocalAIService
	billingSvc *services.BillingService
	reportSvc  *services.ReportService
}

func New(db *database.DB, cfg *config.Config) *Handler {
	return &Handler{
		db:         db,
		cfg:        cfg,
		localAI:    localai.New(db),
		billingSvc: services.NewBillingService(db),
		reportSvc:  services.NewReportService(db),
	}
}

// RegisterRoutes registers all API routes on Echo instance
func (h *Handler) RegisterRoutes(e *echo.Echo) {
	// Root OIDC Auth endpoints for browser redirects
	e.GET("/auth/login", auth.HandleLogin(h.cfg))
	e.GET("/auth/callback", auth.HandleCallback(h.cfg))
	e.GET("/auth/logout", auth.HandleLogout(h.cfg))

	api := e.Group("/api/v1")

	// Auth Info & Auth endpoints
	api.GET("/auth/info", h.GetAuthInfo)
	api.GET("/auth/login", auth.HandleLogin(h.cfg))
	api.GET("/auth/callback", auth.HandleCallback(h.cfg))
	api.GET("/auth/logout", auth.HandleLogout(h.cfg))

	// Accounts
	api.GET("/accounts", h.GetAccounts)
	api.POST("/accounts", h.CreateAccount)
	api.GET("/accounts/:id", h.GetAccountByID)
	api.PUT("/accounts/:id", h.UpdateAccount)
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

	// CSV Import Wizard
	api.POST("/import", h.ImportCSV)
	api.POST("/import/inspect", h.InspectCSV)
	api.POST("/import/stage", h.StageCSV)
	api.POST("/import/commit", h.CommitCSV)

	// Auto-Categorization
	api.POST("/categorize/start", h.CategorizeLocalAI)
	api.POST("/categorize/cancel", h.CancelCategorization)
	api.GET("/categorize/status", h.GetLocalAIStatus)
	api.GET("/categorize/prompt", h.GetCategorizationPrompt)
	api.PUT("/categorize/prompt", h.UpdateCategorizationPrompt)
	api.POST("/categorize/prompt/reset", h.ResetCategorizationPrompt)

	// LocalAI Backward compatibility aliases
	api.POST("/categorize/localai", h.CategorizeLocalAI)
	api.GET("/categorize/localai/status", h.GetLocalAIStatus)
	api.POST("/categorize/localai/test", h.TestLocalAIConnection)
	api.POST("/categorize/localai/models", h.GetLocalAIModels)

	// Billing Cycles (Reconciliation)
	api.GET("/billing-cycles", h.GetBillingCycles)
	api.GET("/billing-cycles/:id", h.GetBillingCycleDetail)
	api.POST("/billing-cycles/:id/auto-populate", h.AutoPopulateCycle)
	api.GET("/billing-cycles/:id/bank-candidates", h.GetBankPaymentCandidates)
	api.POST("/billing-cycles/:id/reconcile", h.ReconcileCycle)
	api.POST("/billing-cycles/:id/unlink", h.UnlinkCycle)
	api.POST("/reconciliation/auto-match", h.AutoMatchCCPayments)
	api.DELETE("/billing-cycles/:id", h.DeleteBillingCycle)
	api.POST("/transactions/:id/assign-cc", h.AssignTransactionCC)

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

func (h *Handler) UpdateAccount(c echo.Context) error {
	id := c.Param("id")
	var acc models.Account
	if err := c.Bind(&acc); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid payload"})
	}
	if err := h.db.UpdateAccount(id, &acc); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
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

	offset := 0
	if o := c.QueryParam("offset"); o != "" {
		if val, err := strconv.Atoi(o); err == nil {
			offset = val
		}
	}

	var categoryIDs []string
	if c.QueryParam("category_ids") != "" {
		categoryIDs = strings.Split(c.QueryParam("category_ids"), ",")
	} else if params := c.QueryParams()["category_ids"]; len(params) > 0 {
		categoryIDs = params
	}

	filter := database.TransactionFilter{
		AccountID:    c.QueryParam("account_id"),
		CategoryID:   c.QueryParam("category_id"),
		CategoryIDs:  categoryIDs,
		CategoryType: c.QueryParam("category_type"),
		Unreviewed:   unreviewed,
		Search:       c.QueryParam("search"),
		StartDate:    c.QueryParam("start_date"),
		EndDate:      c.QueryParam("end_date"),
		Limit:        limit,
		Offset:       offset,
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
	if payeeCol2 := c.FormValue("payee_column_2"); payeeCol2 != "" {
		preset.PayeeColumn2 = &payeeCol2
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
	if bDateCol := c.FormValue("billing_date_column"); bDateCol != "" {
		preset.BillingDateColumn = &bDateCol
	}
	if origAmtCol := c.FormValue("original_amount_column"); origAmtCol != "" {
		preset.OriginalAmountColumn = &origAmtCol
	}
	if origCurrCol := c.FormValue("original_currency_column"); origCurrCol != "" {
		preset.OriginalCurrencyColumn = &origCurrCol
	}
	if cutoffDate := c.FormValue("cutoff_date"); cutoffDate != "" {
		preset.CutoffDate = &cutoffDate
	}

	p := parser.NewCSVParser(h.db)
	txs, _, err := p.ParseCSV(accountID, data, preset)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	imported := 0
	duplicates := 0
	var duplicateRecords []DuplicateRecordInfo
	seenHashes := make(map[string]bool)

	for _, tx := range txs {
		if tx.ImportHash != "" && seenHashes[tx.ImportHash] {
			duplicates++
			duplicateRecords = append(duplicateRecords, DuplicateRecordInfo{
				Date:           tx.Date,
				PayeeRaw:       tx.PayeeRaw,
				Amount:         tx.Amount,
				Currency:       tx.Currency,
				OriginalAmount: tx.OriginalAmount,
				ImportHash:     tx.ImportHash,
				Reason:         "Duplicate transaction in file",
			})
			continue
		}

		if err := h.db.CreateTransaction(&tx); err == nil {
			imported++
			if tx.ImportHash != "" {
				seenHashes[tx.ImportHash] = true
			}
		} else {
			duplicates++
			duplicateRecords = append(duplicateRecords, DuplicateRecordInfo{
				Date:           tx.Date,
				PayeeRaw:       tx.PayeeRaw,
				Amount:         tx.Amount,
				Currency:       tx.Currency,
				OriginalAmount: tx.OriginalAmount,
				ImportHash:     tx.ImportHash,
				Reason:         "Already exists in database",
			})
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"imported":          imported,
		"duplicates":        duplicates,
		"total":             len(txs),
		"duplicate_records": duplicateRecords,
	})
}

type DuplicateRecordInfo struct {
	Date           string   `json:"date"`
	PayeeRaw       string   `json:"payee_raw"`
	Amount         float64  `json:"amount"`
	Currency       string   `json:"currency"`
	OriginalAmount *float64 `json:"original_amount"`
	ImportHash     string   `json:"import_hash"`
	Reason         string   `json:"reason"`
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

	accountID := c.FormValue("account_id")
	if accountID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "account_id is required"})
	}

	hasHeader := c.FormValue("has_header") != "false"
	dateFormat := c.FormValue("date_format")
	if dateFormat == "" {
		dateFormat = "YYYY-MM-DD"
	}

	preset := &models.ImportPreset{
		HasHeader:  hasHeader,
		DateFormat: dateFormat,
		DateColumn: c.FormValue("date_column"),
		PayeeColumn: c.FormValue("payee_column"),
	}

	if payeeCol2 := c.FormValue("payee_column_2"); payeeCol2 != "" {
		preset.PayeeColumn2 = &payeeCol2
	}
	if amtCol := c.FormValue("amount_column"); amtCol != "" {
		preset.AmountColumn = &amtCol
	}
	if debitCol := c.FormValue("debit_column"); debitCol != "" {
		preset.DebitColumn = &debitCol
	}
	if creditCol := c.FormValue("credit_column"); creditCol != "" {
		preset.CreditColumn = &creditCol
	}
	if bDateCol := c.FormValue("billing_date_column"); bDateCol != "" {
		preset.BillingDateColumn = &bDateCol
	}
	if currInstCol := c.FormValue("current_installment_column"); currInstCol != "" {
		preset.CurrentInstallmentColumn = &currInstCol
	}
	if totalInstCol := c.FormValue("total_installments_column"); totalInstCol != "" {
		preset.TotalInstallmentsColumn = &totalInstCol
	}
	if origAmtCol := c.FormValue("original_amount_column"); origAmtCol != "" {
		preset.OriginalAmountColumn = &origAmtCol
	}
	if origCurrCol := c.FormValue("original_currency_column"); origCurrCol != "" {
		preset.OriginalCurrencyColumn = &origCurrCol
	}
	if cutoffDate := c.FormValue("cutoff_date"); cutoffDate != "" {
		preset.CutoffDate = &cutoffDate
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
	var duplicateRecords []DuplicateRecordInfo
	seenHashes := make(map[string]bool)

	for _, tx := range payload.Transactions {
		if tx.ImportHash != "" && seenHashes[tx.ImportHash] {
			duplicates++
			duplicateRecords = append(duplicateRecords, DuplicateRecordInfo{
				Date:           tx.Date,
				PayeeRaw:       tx.PayeeRaw,
				Amount:         tx.Amount,
				Currency:       tx.Currency,
				OriginalAmount: tx.OriginalAmount,
				ImportHash:     tx.ImportHash,
				Reason:         "Duplicate transaction in file",
			})
			continue
		}

		if err := h.db.CreateTransaction(&tx); err == nil {
			imported++
			if tx.ImportHash != "" {
				seenHashes[tx.ImportHash] = true
			}
		} else {
			duplicates++
			duplicateRecords = append(duplicateRecords, DuplicateRecordInfo{
				Date:           tx.Date,
				PayeeRaw:       tx.PayeeRaw,
				Amount:         tx.Amount,
				Currency:       tx.Currency,
				OriginalAmount: tx.OriginalAmount,
				ImportHash:     tx.ImportHash,
				Reason:         "Already exists in database",
			})
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"imported":          imported,
		"duplicates":        duplicates,
		"total":             len(payload.Transactions),
		"duplicate_records": duplicateRecords,
	})
}

func (h *Handler) CategorizeLocalAI(c echo.Context) error {
	slog.Info("CategorizeLocalAI endpoint invoked - starting async background worker")
	status, err := h.localAI.StartBackgroundCategorization()
	if err != nil {
		slog.Error("Failed to start background LocalAI categorization", "error", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusAccepted, status)
}

func (h *Handler) GetLocalAIStatus(c echo.Context) error {
	status := h.localAI.GetStatus()
	return c.JSON(http.StatusOK, status)
}

func (h *Handler) CancelCategorization(c echo.Context) error {
	status := h.localAI.CancelBackgroundCategorization()
	return c.JSON(http.StatusOK, status)
}

func (h *Handler) GetCategorizationPrompt(c echo.Context) error {
	currentPrompt := h.localAI.GetPrompt()
	return c.JSON(http.StatusOK, map[string]string{
		"prompt":         currentPrompt,
		"default_prompt": localai.SystemPrompt,
	})
}

func (h *Handler) UpdateCategorizationPrompt(c echo.Context) error {
	var body struct {
		Prompt string `json:"prompt"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}
	if err := h.localAI.SetPrompt(body.Prompt); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) ResetCategorizationPrompt(c echo.Context) error {
	if err := h.localAI.ResetPrompt(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{
		"status": "reset",
		"prompt": localai.SystemPrompt,
	})
}

func (h *Handler) TestLocalAIConnection(c echo.Context) error {
	var body struct {
		LocalAIURL    string `json:"localai_url"`
		LocalAIModel  string `json:"localai_model"`
		LocalAIAPIKey string `json:"localai_api_key"`
	}
	_ = c.Bind(&body)

	msg, err := h.localAI.TestConnection(c.Request().Context(), body.LocalAIURL, body.LocalAIModel, body.LocalAIAPIKey)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": msg})
}

func (h *Handler) GetLocalAIModels(c echo.Context) error {
	var body struct {
		LocalAIURL    string `json:"localai_url"`
		LocalAIAPIKey string `json:"localai_api_key"`
	}
	_ = c.Bind(&body)

	modelsList, err := h.localAI.FetchAvailableModels(c.Request().Context(), body.LocalAIURL, body.LocalAIAPIKey)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{"models": modelsList})
}

func (h *Handler) GetBillingCycles(c echo.Context) error {
	accountID := c.QueryParam("account_id")
	status := c.QueryParam("status")
	cycles, err := h.db.GetBillingCycles(accountID, status)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	if cycles == nil {
		cycles = []models.BillingCycle{}
	}
	return c.JSON(http.StatusOK, cycles)
}



func (h *Handler) GetBillingCycleDetail(c echo.Context) error {
	id := c.Param("id")
	cycle, err := h.db.GetBillingCycleByID(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Billing cycle not found"})
	}

	txs, err := h.db.GetCycleTransactions(id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	if txs == nil {
		txs = []models.Transaction{}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"billing_cycle": cycle,
		"transactions":  txs,
	})
}

func (h *Handler) AutoPopulateCycle(c echo.Context) error {
	id := c.Param("id")
	count, err := h.billingSvc.AutoPopulateCycle(id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	cycle, _ := h.db.GetBillingCycleByID(id)
	return c.JSON(http.StatusOK, map[string]interface{}{
		"assigned_count": count,
		"billing_cycle":  cycle,
	})
}

func (h *Handler) GetBankPaymentCandidates(c echo.Context) error {
	id := c.Param("id")
	candidates, err := h.billingSvc.FindBankPaymentCandidates(id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	if candidates == nil {
		candidates = []models.Transaction{}
	}
	return c.JSON(http.StatusOK, candidates)
}

type ReconcileCycleRequest struct {
	BankTransactionID string `json:"bank_transaction_id"`
}

func (h *Handler) ReconcileCycle(c echo.Context) error {
	id := c.Param("id")
	var req ReconcileCycleRequest
	if err := c.Bind(&req); err != nil || req.BankTransactionID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "bank_transaction_id is required"})
	}

	if err := h.billingSvc.ReconcileCycle(id, req.BankTransactionID); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	cycle, _ := h.db.GetBillingCycleByID(id)
	return c.JSON(http.StatusOK, cycle)
}

func (h *Handler) UnlinkCycle(c echo.Context) error {
	id := c.Param("id")
	if err := h.billingSvc.UnlinkCycle(id); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	cycle, _ := h.db.GetBillingCycleByID(id)
	return c.JSON(http.StatusOK, cycle)
}

func (h *Handler) DeleteBillingCycle(c echo.Context) error {
	id := c.Param("id")
	if err := h.db.DeleteBillingCycle(id); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}

type AssignCCRequest struct {
	CreditCardAccountID *string `json:"credit_card_account_id"`
}

func (h *Handler) AssignTransactionCC(c echo.Context) error {
	txID := c.Param("id")
	var req AssignCCRequest
	_ = c.Bind(&req)

	targetAccID := ""
	if req.CreditCardAccountID != nil {
		targetAccID = *req.CreditCardAccountID
	}

	if err := h.db.LinkBankPaymentToAccount(txID, targetAccID); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	updated, err := h.db.GetTransactionByID(txID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *Handler) GetNetWorthReport(c echo.Context) error {
	res, err := h.reportSvc.GetNetWorthTrend(
		c.QueryParam("start_date"),
		c.QueryParam("end_date"),
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) GetCashFlowReport(c echo.Context) error {
	res, err := h.reportSvc.GetCashFlowSummary(
		c.QueryParam("account_id"),
		c.QueryParam("start_date"),
		c.QueryParam("end_date"),
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) GetCategoryDonutReport(c echo.Context) error {
	res, err := h.reportSvc.GetCategoryDonut(
		c.QueryParam("account_id"),
		c.QueryParam("start_date"),
		c.QueryParam("end_date"),
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) GetBudgetVsActualReport(c echo.Context) error {
	res, err := h.reportSvc.GetBudgetVsActual(
		c.QueryParam("account_id"),
		c.QueryParam("month"),
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) GetSubscriptionsReport(c echo.Context) error {
	res, err := h.reportSvc.GetSubscriptions(c.QueryParam("account_id"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) GetCCPayoffReport(c echo.Context) error {
	res, err := h.reportSvc.GetCCPayoffForecast(c.QueryParam("account_id"))
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
	res, err := h.reportSvc.GetMoMHeatmap(
		c.QueryParam("account_id"),
		c.QueryParam("start_date"),
		c.QueryParam("end_date"),
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	if res == nil {
		res = []services.MoMRow{}
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) AutoMatchCCPayments(c echo.Context) error {
	count, err := h.billingSvc.AutoMatchCCPayments()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"matched_count": count,
		"message":       fmt.Sprintf("Successfully matched %d credit card payments", count),
	})
}
