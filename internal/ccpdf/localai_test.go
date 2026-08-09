package ccpdf

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestConfigTimeoutDefaults(t *testing.T) {
	cfg := DefaultConfig()
	if cfg.BatchSize != 10 {
		t.Errorf("expected default BatchSize 10, got %d", cfg.BatchSize)
	}
	if cfg.BatchTimeoutSeconds != 120 {
		t.Errorf("expected default BatchTimeoutSeconds 120s, got %d", cfg.BatchTimeoutSeconds)
	}
}

func TestFixPayeeSpacesBatch(t *testing.T) {
	requestCount := 0
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"choices": []map[string]interface{}{
				{
					"message": map[string]string{
						"content": `{"סיבוס פלאקסימסעדות": "סיבוס פלאקסי מסעדות", "דור אלוןבני דרור": "דור אלון בני דרור"}`,
					},
				},
			},
		})
	}))
	defer ts.Close()

	cfg := &Config{
		APIURL:              ts.URL,
		Model:               "test-model",
		BatchSize:           10,
		BatchTimeoutSeconds: 10,
	}

	client := NewLocalAIClient(cfg)
	inputPayees := []string{
		"סיבוס פלאקסימסעדות",
		"דור אלוןבני דרור",
		"NonHebrewPayee",
	}

	resultMap, err := client.FixPayeeSpacesBatch(inputPayees)
	if err != nil {
		t.Fatalf("FixPayeeSpacesBatch failed: %v", err)
	}

	if requestCount != 1 {
		t.Errorf("expected exactly 1 HTTP request for batch, got %d", requestCount)
	}

	if resultMap["סיבוס פלאקסימסעדות"] != "סיבוס פלאקסי מסעדות" {
		t.Errorf("expected 'סיבוס פלאקסי מסעדות', got '%s'", resultMap["סיבוס פלאקסימסעדות"])
	}

	if resultMap["דור אלוןבני דרור"] != "דור אלון בני דרור" {
		t.Errorf("expected 'דור אלון בני דרור', got '%s'", resultMap["דור אלוןבני דרור"])
	}

	if resultMap["NonHebrewPayee"] != "NonHebrewPayee" {
		t.Errorf("expected 'NonHebrewPayee', got '%s'", resultMap["NonHebrewPayee"])
	}

	// Verify second call uses cache and sends 0 additional HTTP requests
	_, _ = client.FixPayeeSpacesBatch(inputPayees)
	if requestCount != 1 {
		t.Errorf("expected cache hit to make 0 additional HTTP requests, got total %d", requestCount)
	}
}
