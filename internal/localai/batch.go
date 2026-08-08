package localai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/liorokman/finrep/internal/database"
	"github.com/liorokman/finrep/internal/models"
)

type LocalAIService struct {
	db     *database.DB
	client *http.Client
}

func New(db *database.DB) *LocalAIService {
	return &LocalAIService{
		db: db,
		client: &http.Client{
			Timeout: 180 * time.Second,
		},
	}
}

type BatchCategorizationRequest struct {
	Transactions []models.Transaction `json:"transactions"`
	Categories   []models.Category    `json:"categories"`
}

type CategorySuggestionPayload struct {
	NameHE       string              `json:"name_he"`
	NameEN       string              `json:"name_en"`
	CategoryType models.CategoryType `json:"category_type"`
}

type TransactionCategorizationResult struct {
	TransactionID     string                      `json:"transaction_id"`
	CategoryID        *string                     `json:"category_id"`
	SuggestedCategory *CategorySuggestionPayload `json:"suggested_category"`
	Confidence        float64                     `json:"confidence"`
}

type LocalAIBatchResponse struct {
	Categorizations []TransactionCategorizationResult `json:"categorizations"`
}

const SystemPrompt = `You are a financial transaction categorization assistant specialized in Israeli and international transactions.
You understand Hebrew, English, and transliterated Hebrew merchant names.

For each transaction in the batch:
1. Match it to an existing category ID from the allowed list if a clear fit exists.
2. If NONE of the existing categories fits, leave 'category_id' as null and provide a 'suggested_category' object with proposed Hebrew and English names:
   {"name_he": "...", "name_en": "...", "category_type": "EXPENSE" | "INCOME" | "TRANSFER"}

Respond ONLY with valid JSON matching this schema:
{
  "categorizations": [
    {
      "transaction_id": "string",
      "category_id": "string or null",
      "suggested_category": {"name_he": "string", "name_en": "string", "category_type": "EXPENSE"} or null,
      "confidence": 0.95
    }
  ]
}`

// CategorizeBatch sends unreviewed transactions to LocalAI in 5-item micro-batches
func (s *LocalAIService) CategorizeBatch(ctx context.Context, txs []models.Transaction) (int, error) {
	if len(txs) == 0 {
		return 0, nil
	}

	url, err := s.db.GetSetting("localai_url")
	if err != nil || url == "" {
		url = "http://localhost:8080"
	}
	model, err := s.db.GetSetting("localai_model")
	if err != nil || model == "" {
		model = "llama-3-8b"
	}
	apiKey, _ := s.db.GetSetting("localai_api_key")

	categories, err := s.db.GetCategories()
	if err != nil {
		return 0, fmt.Errorf("failed to fetch categories for LocalAI: %w", err)
	}

	baseUrl := strings.TrimRight(url, "/")
	var endpoint string
	if strings.HasSuffix(baseUrl, "/v1/chat/completions") {
		endpoint = baseUrl
	} else if strings.HasSuffix(baseUrl, "/v1") {
		endpoint = baseUrl + "/chat/completions"
	} else {
		endpoint = baseUrl + "/v1/chat/completions"
	}

	const chunkSize = 5
	totalProcessed := 0
	numChunks := (len(txs) + chunkSize - 1) / chunkSize

	for i := 0; i < len(txs); i += chunkSize {
		end := i + chunkSize
		if end > len(txs) {
			end = len(txs)
		}
		chunk := txs[i:end]
		chunkNum := (i / chunkSize) + 1

		slog.Info("Processing LocalAI micro-batch", "batch", chunkNum, "total_batches", numChunks, "count", len(chunk), "endpoint", endpoint, "model", model)

		var inputBatch []map[string]interface{}
		for _, t := range chunk {
			inputBatch = append(inputBatch, map[string]interface{}{
				"id":       t.ID,
				"payee":    t.PayeeRaw,
				"amount":   t.Amount,
				"date":     t.Date,
				"currency": t.Currency,
			})
		}

		reqBody := map[string]interface{}{
			"model": model,
			"messages": []map[string]string{
				{"role": "system", "content": SystemPrompt},
				{"role": "user", "content": fmt.Sprintf("Categories: %v\n\nTransactions to categorize: %v", categoriesJSON(categories), jsonString(inputBatch))},
			},
			"temperature": 0.1,
		}

		jsonBytes, err := json.Marshal(reqBody)
		if err != nil {
			return totalProcessed, fmt.Errorf("batch %d JSON encode failed: %w", chunkNum, err)
		}

		req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(jsonBytes))
		if err != nil {
			return totalProcessed, fmt.Errorf("batch %d request creation failed: %w", chunkNum, err)
		}
		req.Header.Set("Content-Type", "application/json")
		if apiKey != "" {
			req.Header.Set("Authorization", "Bearer "+apiKey)
		}

		resp, err := s.client.Do(req)
		if err != nil {
			return totalProcessed, fmt.Errorf("batch %d/%d connection failed to %s: %w", chunkNum, numChunks, endpoint, err)
		}

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			return totalProcessed, fmt.Errorf("batch %d/%d LocalAI (%s) returned HTTP %d: %s", chunkNum, numChunks, endpoint, resp.StatusCode, string(body))
		}

		var chatResp struct {
			Choices []struct {
				Message struct {
					Content string `json:"content"`
				} `json:"message"`
			} `json:"choices"`
		}

		decodeErr := json.NewDecoder(resp.Body).Decode(&chatResp)
		resp.Body.Close()
		if decodeErr != nil {
			return totalProcessed, fmt.Errorf("batch %d/%d decode error: %w", chunkNum, numChunks, decodeErr)
		}

		if len(chatResp.Choices) == 0 {
			return totalProcessed, fmt.Errorf("batch %d/%d empty response from LocalAI", chunkNum, numChunks)
		}

		rawContent := chatResp.Choices[0].Message.Content
		cleanJSON := StripMarkdownCodeFences(rawContent)

		var batchResp LocalAIBatchResponse
		if err := json.Unmarshal([]byte(cleanJSON), &batchResp); err != nil {
			slog.Warn("Failed to unmarshal LocalAI batch response JSON", "batch", chunkNum, "error", err, "raw", cleanJSON)
			totalProcessed += len(chunk)
			continue
		}

		// Apply categorizations & suggestions to database immediately
		for _, item := range batchResp.Categorizations {
			if item.CategoryID != nil && *item.CategoryID != "" {
				_ = s.db.UpdateTransactionCategory(item.TransactionID, item.CategoryID, false, models.CategorizedByLocalAI)
			} else if item.SuggestedCategory != nil {
				_, _ = s.db.Exec(`
					UPDATE transactions
					SET suggested_category_he = ?, suggested_category_en = ?, suggested_category_type = ?, categorized_by = 'LOCALAI', updated_at = CURRENT_TIMESTAMP
					WHERE id = ?
				`, item.SuggestedCategory.NameHE, item.SuggestedCategory.NameEN, item.SuggestedCategory.CategoryType, item.TransactionID)
			}
		}

		totalProcessed += len(chunk)
		slog.Info("Micro-batch saved to database", "batch", chunkNum, "total_batches", numChunks, "processed", totalProcessed)
	}

	return totalProcessed, nil
}

func StripMarkdownCodeFences(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		idx := strings.Index(s, "\n")
		if idx != -1 {
			s = s[idx+1:]
		}
		s = strings.TrimSuffix(s, "```")
		s = strings.TrimSuffix(s, "```json")
		s = strings.TrimSpace(s)
	}
	return s
}

func categoriesJSON(cats []models.Category) string {
	b, _ := json.Marshal(cats)
	return string(b)
}

func jsonString(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func (s *LocalAIService) TestConnection(ctx context.Context, customUrl, customModel, customApiKey string) (string, error) {
	url := customUrl
	if url == "" {
		url, _ = s.db.GetSetting("localai_url")
	}
	if url == "" {
		url = "http://localhost:8080"
	}

	model := customModel
	if model == "" {
		model, _ = s.db.GetSetting("localai_model")
	}
	if model == "" {
		model = "llama-3-8b"
	}

	apiKey := customApiKey
	if apiKey == "" {
		apiKey, _ = s.db.GetSetting("localai_api_key")
	}

	baseUrl := strings.TrimRight(url, "/")
	var endpoint string
	if strings.HasSuffix(baseUrl, "/v1/chat/completions") {
		endpoint = baseUrl
	} else if strings.HasSuffix(baseUrl, "/v1") {
		endpoint = baseUrl + "/chat/completions"
	} else {
		endpoint = baseUrl + "/v1/chat/completions"
	}

	reqBody := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{"role": "user", "content": "Hello! Reply with 'OK'."},
		},
		"max_tokens": 10,
	}
	b, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(b))
	if err != nil {
		return "", fmt.Errorf("invalid request URL (%s): %w", endpoint, err)
	}
	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("cannot connect to LocalAI at %s: %w", endpoint, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("LocalAI at %s returned HTTP %d: %s", endpoint, resp.StatusCode, string(body))
	}

	return fmt.Sprintf("Successfully connected to LocalAI endpoint (%s) using model '%s'", endpoint, model), nil
}

