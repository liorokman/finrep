package localai

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/liorokman/finrep/internal/database"
)

func TestGetBatchSize(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")
	sqlDB, err := database.InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
	defer sqlDB.Close()
	db := database.New(sqlDB)

	svc := New(db)

	// Default should be 5
	if sz := svc.GetBatchSize(); sz != 5 {
		t.Errorf("Expected default batch size 5, got %d", sz)
	}

	// Set custom batch size
	if err := db.SetSetting("localai_batch_size", "15"); err != nil {
		t.Fatalf("Failed to set batch size setting: %v", err)
	}

	if sz := svc.GetBatchSize(); sz != 15 {
		t.Errorf("Expected batch size 15, got %d", sz)
	}
}

func TestFetchAvailableModels(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/models" {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"data": []map[string]string{
					{"id": "llama-3-8b-instruct"},
					{"id": "mistral-7b-v0.3"},
				},
			})
			return
		}
		http.NotFound(w, r)
	}))
	defer ts.Close()

	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")
	sqlDB, err := database.InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
	defer sqlDB.Close()
	db := database.New(sqlDB)

	svc := New(db)

	models, err := svc.FetchAvailableModels(context.Background(), ts.URL, "")
	if err != nil {
		t.Fatalf("FetchAvailableModels failed: %v", err)
	}

	if len(models) != 2 {
		t.Fatalf("Expected 2 models, got %d", len(models))
	}

	if models[0] != "llama-3-8b-instruct" || models[1] != "mistral-7b-v0.3" {
		t.Errorf("Unexpected models returned: %v", models)
	}
}
