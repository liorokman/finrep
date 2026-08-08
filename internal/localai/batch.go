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
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/liorokman/finrep/internal/database"
	"github.com/liorokman/finrep/internal/models"
)

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

type CategorizationStatus struct {
	Running      bool   `json:"running"`
	Processed    int    `json:"processed"`
	Total        int    `json:"total"`
	CurrentBatch int    `json:"current_batch"`
	TotalBatches int    `json:"total_batches"`
	LastError    string `json:"last_error"`
}

type LocalAIService struct {
	db     *database.DB
	client *http.Client
	mu     sync.RWMutex
	status CategorizationStatus
}

func New(db *database.DB) *LocalAIService {
	return &LocalAIService{
		db: db,
		client: &http.Client{
			Timeout: 180 * time.Second,
		},
	}
}

func (s *LocalAIService) GetStatus() CategorizationStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.status
}

func (s *LocalAIService) StartBackgroundCategorization() (CategorizationStatus, error) {
	s.mu.Lock()
	if s.status.Running {
		st := s.status
		s.mu.Unlock()
		return st, nil
	}

	txs, err := s.db.GetUncategorizedOrUnreviewedTransactions(0)
	if err != nil {
		s.mu.Unlock()
		return CategorizationStatus{}, fmt.Errorf("failed to query uncategorized transactions: %w", err)
	}

	if len(txs) == 0 {
		s.status = CategorizationStatus{Running: false, Total: 0}
		st := s.status
		s.mu.Unlock()
		return st, nil
	}

	const chunkSize = 5
	numChunks := (len(txs) + chunkSize - 1) / chunkSize

	s.status = CategorizationStatus{
		Running:      true,
		Processed:    0,
		Total:        len(txs),
		CurrentBatch: 0,
		TotalBatches: numChunks,
		LastError:    "",
	}

	st := s.status
	s.mu.Unlock()

	go s.runBatchWorker(txs)

	return st, nil
}

func (s *LocalAIService) runBatchWorker(txs []models.Transaction) {
	ctx := context.Background()
	url, _ := s.db.GetSetting("localai_url")
	if url == "" {
		url = "http://localhost:8080"
	}
	model, _ := s.db.GetSetting("localai_model")
	if model == "" {
		model = "llama-3-8b"
	}
	apiKey, _ := s.db.GetSetting("localai_api_key")

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
	numChunks := (len(txs) + chunkSize - 1) / chunkSize

	for i := 0; i < len(txs); i += chunkSize {
		end := i + chunkSize
		if end > len(txs) {
			end = len(txs)
		}
		chunk := txs[i:end]
		chunkNum := (i / chunkSize) + 1

		s.mu.Lock()
		s.status.CurrentBatch = chunkNum
		s.mu.Unlock()

		categories, err := s.db.GetCategories()
		if err != nil {
			s.mu.Lock()
			s.status.LastError = fmt.Sprintf("failed to fetch categories: %v", err)
			s.status.Running = false
			s.mu.Unlock()
			return
		}

		slog.Info("Background LocalAI worker processing micro-batch", "batch", chunkNum, "total_batches", numChunks, "count", len(chunk), "categories_available", len(categories))

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
				{"role": "user", "content": fmt.Sprintf("Allowed Categories:\n%s\n\nTransactions to categorize:\n%s", compactCategoriesJSON(categories), jsonString(inputBatch))},
			},
			"temperature": 0.1,
		}

		jsonBytes, err := json.Marshal(reqBody)
		if err != nil {
			s.mu.Lock()
			s.status.LastError = fmt.Sprintf("batch %d JSON encode failed: %v", chunkNum, err)
			s.status.Running = false
			s.mu.Unlock()
			return
		}

		req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(jsonBytes))
		if err != nil {
			s.mu.Lock()
			s.status.LastError = fmt.Sprintf("batch %d request create failed: %v", chunkNum, err)
			s.status.Running = false
			s.mu.Unlock()
			return
		}
		req.Header.Set("Content-Type", "application/json")
		if apiKey != "" {
			req.Header.Set("Authorization", "Bearer "+apiKey)
		}

		resp, err := s.client.Do(req)
		if err != nil {
			s.mu.Lock()
			s.status.LastError = fmt.Sprintf("batch %d connection failed: %v", chunkNum, err)
			s.status.Running = false
			s.mu.Unlock()
			return
		}

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			s.mu.Lock()
			s.status.LastError = fmt.Sprintf("batch %d returned HTTP %d: %s", chunkNum, resp.StatusCode, string(body))
			s.status.Running = false
			s.mu.Unlock()
			return
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
			s.mu.Lock()
			s.status.LastError = fmt.Sprintf("batch %d decode error: %v", chunkNum, decodeErr)
			s.status.Running = false
			s.mu.Unlock()
			return
		}

		if len(chatResp.Choices) == 0 {
			s.mu.Lock()
			s.status.LastError = fmt.Sprintf("batch %d empty response", chunkNum)
			s.status.Running = false
			s.mu.Unlock()
			return
		}

		rawContent := chatResp.Choices[0].Message.Content
		slog.Debug("LocalAI raw response content", "batch", chunkNum, "raw", rawContent)
		cleanJSON := StripMarkdownCodeFences(rawContent)

		var batchResp LocalAIBatchResponse
		if err := json.Unmarshal([]byte(cleanJSON), &batchResp); err != nil {
			slog.Warn("Failed to unmarshal LocalAI batch response JSON", "batch", chunkNum, "error", err, "raw_content", rawContent, "clean_json", cleanJSON)
			s.mu.Lock()
			s.status.Processed += len(chunk)
			s.mu.Unlock()
			continue
		}

		// Apply categorizations & suggestions to database immediately
		for _, item := range batchResp.Categorizations {
			if item.TransactionID == "" {
				continue
			}

			latestCats, _ := s.db.GetCategories()
			var targetCatID *string

			// 1. Check category_id (matches ID or Name)
			if item.CategoryID != nil && *item.CategoryID != "" {
				catStr := strings.TrimSpace(*item.CategoryID)
				for _, c := range latestCats {
					if c.ID == catStr || strings.EqualFold(c.NameEN, catStr) || strings.EqualFold(c.NameHE, catStr) {
						matchedID := c.ID
						targetCatID = &matchedID
						break
					}
				}
			}

			// 2. Check suggested_category (matches existing Name or create new)
			if targetCatID == nil && item.SuggestedCategory != nil && (item.SuggestedCategory.NameEN != "" || item.SuggestedCategory.NameHE != "") {
				for _, c := range latestCats {
					if (item.SuggestedCategory.NameEN != "" && strings.EqualFold(c.NameEN, item.SuggestedCategory.NameEN)) ||
						(item.SuggestedCategory.NameHE != "" && strings.EqualFold(c.NameHE, item.SuggestedCategory.NameHE)) {
						matchedID := c.ID
						targetCatID = &matchedID
						break
					}
				}

				if targetCatID == nil {
					catType := item.SuggestedCategory.CategoryType
					if catType == "" {
						catType = models.CategoryTypeExpense
					}
					newCat := &models.Category{
						ID:           uuid.New().String(),
						NameHE:       item.SuggestedCategory.NameHE,
						NameEN:       item.SuggestedCategory.NameEN,
						CategoryType: catType,
						ColorHex:     "#3B82F6",
						Icon:         "tag",
					}
					if err := s.db.CreateCategory(newCat); err == nil {
						targetCatID = &newCat.ID
						slog.Info("Created new category suggested by LocalAI", "category_id", newCat.ID, "name_en", newCat.NameEN, "name_he", newCat.NameHE)
					}
				}
			}

			// 3. Update database
			if targetCatID != nil {
				if err := s.db.UpdateTransactionCategory(item.TransactionID, targetCatID, true, models.CategorizedByLocalAI); err != nil {
					slog.Error("Failed to update transaction category", "tx_id", item.TransactionID, "cat_id", *targetCatID, "error", err)
				} else {
					slog.Info("LocalAI assigned category to transaction", "tx_id", item.TransactionID, "cat_id", *targetCatID)
				}
			} else if item.SuggestedCategory != nil {
				_, _ = s.db.Exec(`
					UPDATE transactions
					SET suggested_category_he = ?, suggested_category_en = ?, suggested_category_type = ?, categorized_by = 'LOCALAI', is_reviewed = 1, updated_at = CURRENT_TIMESTAMP
					WHERE id = ?
				`, item.SuggestedCategory.NameHE, item.SuggestedCategory.NameEN, item.SuggestedCategory.CategoryType, item.TransactionID)
				slog.Info("Stored category suggestion for transaction", "tx_id", item.TransactionID, "suggestion_en", item.SuggestedCategory.NameEN)
			}
		}

		s.mu.Lock()
		s.status.Processed += len(chunk)
		s.mu.Unlock()

		slog.Info("Background worker saved micro-batch to SQLite", "batch", chunkNum, "total_batches", numChunks, "processed", s.status.Processed)
	}

	s.mu.Lock()
	s.status.Running = false
	s.mu.Unlock()

	slog.Info("Background worker finished processing all micro-batches", "total_processed", len(txs))
}

func compactCategoriesJSON(cats []models.Category) string {
	type CompactCat struct {
		ID     string `json:"id"`
		NameEN string `json:"name_en"`
		NameHE string `json:"name_he"`
		Type   string `json:"type"`
	}
	var compact []CompactCat
	for _, c := range cats {
		compact = append(compact, CompactCat{
			ID:     c.ID,
			NameEN: c.NameEN,
			NameHE: c.NameHE,
			Type:   string(c.CategoryType),
		})
	}
	b, _ := json.Marshal(compact)
	return string(b)
}

func StripMarkdownCodeFences(s string) string {
	s = strings.TrimSpace(s)
	if startIdx := strings.Index(s, "```"); startIdx != -1 {
		rest := s[startIdx+3:]
		if newLineIdx := strings.Index(rest, "\n"); newLineIdx != -1 {
			rest = rest[newLineIdx+1:]
		}
		if endIdx := strings.Index(rest, "```"); endIdx != -1 {
			s = rest[:endIdx]
		} else {
			s = rest
		}
		s = strings.TrimSpace(s)
	}

	firstBrace := strings.Index(s, "{")
	lastBrace := strings.LastIndex(s, "}")
	if firstBrace != -1 && lastBrace > firstBrace {
		s = s[firstBrace : lastBrace+1]
	}
	return strings.TrimSpace(s)
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

