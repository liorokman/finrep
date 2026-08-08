package handlers_test

import (
	"bytes"
	"encoding/json"
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
		Name:        "Bank Hapoalim",
		AccountType: models.AccountTypeBank,
		Institution: "Hapoalim",
		Currency:    "ILS",
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
