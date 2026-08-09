package handlers_test

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/liorokman/finrep/internal/config"
	"github.com/liorokman/finrep/internal/database"
	"github.com/liorokman/finrep/internal/handlers"
	"github.com/liorokman/finrep/internal/models"
	"github.com/liorokman/finrep/internal/parser"
)

func TestHandlersAccounts(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "finrep_handler_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "test.db")
	sqlDB, err := database.InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer sqlDB.Close()

	db := database.New(sqlDB)
	cfg := &config.Config{OIDCEnabled: false}

	e := echo.New()
	h := handlers.New(db, cfg)
	h.RegisterRoutes(e)

	// Test POST /api/v1/accounts
	accReq := models.Account{
		Name:           "Bank Hapoalim",
		AccountType:    models.AccountTypeBank,
		Institution:    "Hapoalim",
		Currency:       "ILS",
		OpeningBalance: 5000.00,
	}
	body, _ := json.Marshal(accReq)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/accounts", bytes.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected HTTP 201 Created, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	var created models.Account
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("failed to unmarshal created account: %v", err)
	}
	if created.ID == "" || created.Name != "Bank Hapoalim" {
		t.Fatalf("unexpected account: %+v", created)
	}

	// Test GET /api/v1/accounts
	reqGet := httptest.NewRequest(http.MethodGet, "/api/v1/accounts", nil)
	recGet := httptest.NewRecorder()
	e.ServeHTTP(recGet, reqGet)

	if recGet.Code != http.StatusOK {
		t.Fatalf("expected HTTP 200 OK, got %d", recGet.Code)
	}

	var accounts []models.Account
	if err := json.Unmarshal(recGet.Body.Bytes(), &accounts); err != nil {
		t.Fatalf("failed to unmarshal accounts: %v", err)
	}
	if len(accounts) != 1 {
		t.Fatalf("expected 1 account, got %d", len(accounts))
	}
}

func TestImportCalCSVEndToEnd(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "finrep_import_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "test.db")
	sqlDB, err := database.InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer sqlDB.Close()

	db := database.New(sqlDB)
	cfg := &config.Config{OIDCEnabled: false}

	e := echo.New()
	h := handlers.New(db, cfg)
	h.RegisterRoutes(e)

	// Create account first
	acc := &models.Account{
		ID:          "cal_test_acc",
		Name:        "CAL Credit Card",
		AccountType: models.AccountTypeCreditCard,
		Institution: "CAL",
		Currency:    "ILS",
	}
	if err := db.CreateAccount(acc); err != nil {
		t.Fatalf("failed to create account: %v", err)
	}

	calCSVPath := filepath.Join("..", "..", "data", "cal.csv")
	rawBytes, err := os.ReadFile(calCSVPath)
	if err != nil {
		t.Fatalf("failed to read data/cal.csv: %v", err)
	}

	// 1. Test POST /api/v1/import/inspect
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "cal.csv")
	part.Write(rawBytes)
	writer.Close()

	reqInspect := httptest.NewRequest(http.MethodPost, "/api/v1/import/inspect", body)
	reqInspect.Header.Set(echo.HeaderContentType, writer.FormDataContentType())
	recInspect := httptest.NewRecorder()
	e.ServeHTTP(recInspect, reqInspect)

	if recInspect.Code != http.StatusOK {
		t.Fatalf("Inspect failed with HTTP %d: %s", recInspect.Code, recInspect.Body.String())
	}

	var inspectRes parser.InspectResult
	if err := json.Unmarshal(recInspect.Body.Bytes(), &inspectRes); err != nil {
		t.Fatalf("failed to unmarshal inspect response: %v", err)
	}
	t.Logf("Inspect result: columns=%v, total_rows=%d", inspectRes.Columns, inspectRes.TotalRows)

	// 2. Test POST /api/v1/import/stage
	bodyStage := &bytes.Buffer{}
	writerStage := multipart.NewWriter(bodyStage)
	partStage, _ := writerStage.CreateFormFile("file", "cal.csv")
	partStage.Write(rawBytes)
	writerStage.WriteField("account_id", "cal_test_acc")
	writerStage.WriteField("date_column", "Date")
	writerStage.WriteField("payee_column", "Description")
	writerStage.WriteField("payee_column_2", "Extended Description")
	writerStage.WriteField("amount_column", "Amount")
	writerStage.Close()

	reqStage := httptest.NewRequest(http.MethodPost, "/api/v1/import/stage", bodyStage)
	reqStage.Header.Set(echo.HeaderContentType, writerStage.FormDataContentType())
	recStage := httptest.NewRecorder()
	e.ServeHTTP(recStage, reqStage)

	if recStage.Code != http.StatusOK {
		t.Fatalf("Stage failed with HTTP %d: %s", recStage.Code, recStage.Body.String())
	}

	var stageRes parser.StagingResult
	if err := json.Unmarshal(recStage.Body.Bytes(), &stageRes); err != nil {
		t.Fatalf("failed to unmarshal stage response: %v", err)
	}
	t.Logf("Stage result: passed=%d, failed=%d", stageRes.PassedCount, stageRes.FailedCount)

	if stageRes.FailedCount > 0 {
		for i, f := range stageRes.FailedRows {
			if i < 5 {
				t.Logf("Stage failed row %d: %s (raw: %v)", f.RowIndex, f.Reason, f.RawRow)
			}
		}
		t.Fatalf("Stage failed on %d rows!", stageRes.FailedCount)
	}

	// 3. Test POST /api/v1/import/commit
	commitPayload := map[string]interface{}{
		"transactions": stageRes.PassedTransactions,
	}
	commitJSON, _ := json.Marshal(commitPayload)
	reqCommit := httptest.NewRequest(http.MethodPost, "/api/v1/import/commit", bytes.NewReader(commitJSON))
	reqCommit.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	recCommit := httptest.NewRecorder()
	e.ServeHTTP(recCommit, reqCommit)

	if recCommit.Code != http.StatusOK {
		t.Fatalf("Commit failed with HTTP %d: %s", recCommit.Code, recCommit.Body.String())
	}

	var commitRes map[string]int
	if err := json.Unmarshal(recCommit.Body.Bytes(), &commitRes); err != nil {
		t.Fatalf("failed to unmarshal commit response: %v", err)
	}
	t.Logf("Commit result: %+v", commitRes)
	if commitRes["imported"] != 1113 {
		t.Fatalf("Expected 1113 imported transactions, got %d", commitRes["imported"])
	}
}
