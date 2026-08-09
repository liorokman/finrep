package localai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
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
	PayeeRaw          string                      `json:"payee_raw,omitempty"`
	Date              string                      `json:"date,omitempty"`
	Amount            float64                     `json:"amount,omitempty"`
	Currency          string                      `json:"currency,omitempty"`
	CategoryID        *string                     `json:"category_id"`
	CategoryNameEN    string                      `json:"category_name_en,omitempty"`
	CategoryNameHE    string                      `json:"category_name_he,omitempty"`
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

type BatchDetail struct {
	Index       int                                `json:"index"`
	Status      string                             `json:"status"` // "pending", "running", "completed", "failed", "skipped", "canceled"
	TxCount     int                                `json:"tx_count"`
	Error       string                             `json:"error,omitempty"`
	Results     []TransactionCategorizationResult `json:"results,omitempty"`
	CompletedAt *time.Time                         `json:"completed_at,omitempty"`
}

type CategorizationStatus struct {
	Running      bool          `json:"running"`
	Canceled     bool          `json:"canceled"`
	Processed    int           `json:"processed"`
	Total        int           `json:"total"`
	CurrentBatch int           `json:"current_batch"`
	TotalBatches int           `json:"total_batches"`
	LastError    string        `json:"last_error"`
	Batches      []BatchDetail `json:"batches"`
}

type LocalAIService struct {
	db         *database.DB
	client     *http.Client
	mu         sync.RWMutex
	status     CategorizationStatus
	cancelFunc context.CancelFunc
}

func New(db *database.DB) *LocalAIService {
	return &LocalAIService{
		db: db,
		client: &http.Client{
			Transport: &http.Transport{
				MaxIdleConns:      10,
				IdleConnTimeout:   90 * time.Second,
				DisableKeepAlives: false,
			},
		},
	}
}

func (s *LocalAIService) GetBatchSize() int {
	val, err := s.db.GetSetting("localai_batch_size")
	if err == nil && val != "" {
		if n, err := strconv.Atoi(val); err == nil && n >= 1 && n <= 50 {
			return n
		}
	}
	return 5
}

func (s *LocalAIService) GetStatus() CategorizationStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.status
}

func (s *LocalAIService) GetPrompt() string {
	val, err := s.db.GetSetting("localai_prompt")
	if err == nil && strings.TrimSpace(val) != "" {
		return val
	}
	return SystemPrompt
}

func (s *LocalAIService) SetPrompt(prompt string) error {
	return s.db.SetSetting("localai_prompt", prompt)
}

func (s *LocalAIService) ResetPrompt() error {
	return s.db.SetSetting("localai_prompt", "")
}

func (s *LocalAIService) CancelBackgroundCategorization() CategorizationStatus {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.cancelFunc != nil {
		s.cancelFunc()
		s.cancelFunc = nil
	}

	if s.status.Running {
		s.status.Running = false
		s.status.Canceled = true
		s.status.LastError = "Categorization canceled by user"
		for i := range s.status.Batches {
			if s.status.Batches[i].Status == "pending" || s.status.Batches[i].Status == "running" {
				s.status.Batches[i].Status = "canceled"
			}
		}
	}
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
		s.status = CategorizationStatus{Running: false, Total: 0, Batches: []BatchDetail{}}
		st := s.status
		s.mu.Unlock()
		return st, nil
	}

	chunkSize := s.GetBatchSize()
	numChunks := (len(txs) + chunkSize - 1) / chunkSize

	batches := make([]BatchDetail, numChunks)
	for i := 0; i < numChunks; i++ {
		start := i * chunkSize
		end := start + chunkSize
		if end > len(txs) {
			end = len(txs)
		}
		batches[i] = BatchDetail{
			Index:   i + 1,
			Status:  "pending",
			TxCount: end - start,
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	s.cancelFunc = cancel

	s.status = CategorizationStatus{
		Running:      true,
		Canceled:     false,
		Processed:    0,
		Total:        len(txs),
		CurrentBatch: 0,
		TotalBatches: numChunks,
		LastError:    "",
		Batches:      batches,
	}

	st := s.status
	s.mu.Unlock()

	go s.runBatchWorker(ctx, txs)

	return st, nil
}

func (s *LocalAIService) runBatchWorker(ctx context.Context, txs []models.Transaction) {
	url, _ := s.db.GetSetting("localai_url")
	if url == "" {
		url = "http://localhost:8080"
	}
	model, _ := s.db.GetSetting("localai_model")
	if model == "" {
		model = "llama-3-8b"
	}
	apiKey, _ := s.db.GetSetting("localai_api_key")
	sysPrompt := s.GetPrompt()

	baseUrl := strings.TrimRight(url, "/")
	var endpoint string
	if strings.HasSuffix(baseUrl, "/v1/chat/completions") {
		endpoint = baseUrl
	} else if strings.HasSuffix(baseUrl, "/v1") {
		endpoint = baseUrl + "/chat/completions"
	} else {
		endpoint = baseUrl + "/v1/chat/completions"
	}

	chunkSize := s.GetBatchSize()
	numChunks := (len(txs) + chunkSize - 1) / chunkSize

	for i := 0; i < len(txs); i += chunkSize {
		select {
		case <-ctx.Done():
			slog.Info("Background LocalAI worker received cancel signal, aborting run")
			s.mu.Lock()
			s.status.Running = false
			s.status.Canceled = true
			for bIdx := range s.status.Batches {
				if s.status.Batches[bIdx].Status == "pending" || s.status.Batches[bIdx].Status == "running" {
					s.status.Batches[bIdx].Status = "canceled"
				}
			}
			s.mu.Unlock()
			return
		default:
		}

		end := i + chunkSize
		if end > len(txs) {
			end = len(txs)
		}
		chunk := txs[i:end]
		batchIndex := i / chunkSize
		chunkNum := batchIndex + 1

		s.mu.Lock()
		s.status.CurrentBatch = chunkNum
		if batchIndex < len(s.status.Batches) {
			s.status.Batches[batchIndex].Status = "running"
		}
		s.mu.Unlock()

		categories, err := s.db.GetCategories()
		if err != nil {
			s.mu.Lock()
			s.status.LastError = fmt.Sprintf("failed to fetch categories: %v", err)
			s.status.Running = false
			if batchIndex < len(s.status.Batches) {
				s.status.Batches[batchIndex].Status = "failed"
				s.status.Batches[batchIndex].Error = err.Error()
			}
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
				{"role": "system", "content": sysPrompt},
				{"role": "user", "content": fmt.Sprintf("Allowed Categories:\n%s\n\nTransactions to categorize:\n%s", compactCategoriesJSON(categories), jsonString(inputBatch))},
			},
			"temperature": 0.1,
		}

		jsonBytes, err := json.Marshal(reqBody)
		if err != nil {
			slog.Error("Micro-batch JSON marshal error", "batch", chunkNum, "error", err)
			s.mu.Lock()
			s.status.Processed += len(chunk)
			if batchIndex < len(s.status.Batches) {
				s.status.Batches[batchIndex].Status = "failed"
				s.status.Batches[batchIndex].Error = err.Error()
			}
			s.mu.Unlock()
			continue
		}

		var resp *http.Response
		var lastBatchErr error

		// Retry up to 3 times per micro-batch with exponential backoff
		for attempt := 1; attempt <= 3; attempt++ {
			select {
			case <-ctx.Done():
				slog.Info("Background worker canceled during retry loop")
				s.mu.Lock()
				s.status.Running = false
				s.status.Canceled = true
				if batchIndex < len(s.status.Batches) {
					s.status.Batches[batchIndex].Status = "canceled"
				}
				s.mu.Unlock()
				return
			default:
			}

			reqCtx, cancel := context.WithTimeout(ctx, 120*time.Second)
			req, err := http.NewRequestWithContext(reqCtx, "POST", endpoint, bytes.NewReader(jsonBytes))
			if err != nil {
				cancel()
				lastBatchErr = err
				break
			}
			req.Header.Set("Content-Type", "application/json")
			if apiKey != "" {
				req.Header.Set("Authorization", "Bearer "+apiKey)
			}

			resp, err = s.client.Do(req)
			if err == nil && resp.StatusCode == http.StatusOK {
				cancel()
				break
			}

			if err != nil {
				lastBatchErr = err
				slog.Warn("Micro-batch request failed, retrying", "batch", chunkNum, "attempt", attempt, "error", err)
			} else {
				body, _ := io.ReadAll(resp.Body)
				resp.Body.Close()
				lastBatchErr = fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
				slog.Warn("Micro-batch returned non-200 status, retrying", "batch", chunkNum, "attempt", attempt, "status", resp.StatusCode)
			}
			cancel()

			if attempt < 3 {
				time.Sleep(time.Duration(attempt*2) * time.Second)
			}
		}

		if lastBatchErr != nil && (resp == nil || resp.StatusCode != http.StatusOK) {
			slog.Error("Micro-batch failed after 3 attempts, skipping batch and continuing", "batch", chunkNum, "error", lastBatchErr)
			s.mu.Lock()
			s.status.Processed += len(chunk)
			s.status.LastError = fmt.Sprintf("Warning: batch %d/%d skipped (%v)", chunkNum, numChunks, lastBatchErr)
			if batchIndex < len(s.status.Batches) {
				s.status.Batches[batchIndex].Status = "skipped"
				s.status.Batches[batchIndex].Error = lastBatchErr.Error()
			}
			s.mu.Unlock()
			continue
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
			slog.Warn("Micro-batch decode error, skipping batch", "batch", chunkNum, "error", decodeErr)
			s.mu.Lock()
			s.status.Processed += len(chunk)
			if batchIndex < len(s.status.Batches) {
				s.status.Batches[batchIndex].Status = "skipped"
				s.status.Batches[batchIndex].Error = decodeErr.Error()
			}
			s.mu.Unlock()
			continue
		}

		if len(chatResp.Choices) == 0 {
			s.mu.Lock()
			s.status.LastError = fmt.Sprintf("batch %d empty response", chunkNum)
			s.status.Running = false
			if batchIndex < len(s.status.Batches) {
				s.status.Batches[batchIndex].Status = "failed"
				s.status.Batches[batchIndex].Error = "empty response"
			}
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
			if batchIndex < len(s.status.Batches) {
				s.status.Batches[batchIndex].Status = "skipped"
				s.status.Batches[batchIndex].Error = fmt.Sprintf("JSON parse error: %v", err)
			}
			s.mu.Unlock()
			continue
		}

		chunkTxMap := make(map[string]models.Transaction)
		for _, t := range chunk {
			chunkTxMap[t.ID] = t
		}

		// Apply categorizations & suggestions to database immediately
		for itemIdx, item := range batchResp.Categorizations {
			if item.TransactionID == "" {
				continue
			}

			if origTx, ok := chunkTxMap[item.TransactionID]; ok {
				batchResp.Categorizations[itemIdx].PayeeRaw = origTx.PayeeRaw
				batchResp.Categorizations[itemIdx].Date = origTx.Date
				batchResp.Categorizations[itemIdx].Amount = origTx.Amount
				batchResp.Categorizations[itemIdx].Currency = origTx.Currency
			}

			latestCats, _ := s.db.GetCategories()
			var targetCatID *string
			var targetCatNameEN, targetCatNameHE string

			// 1. Check category_id (matches ID or Name)
			if item.CategoryID != nil && *item.CategoryID != "" {
				catStr := strings.TrimSpace(*item.CategoryID)
				for _, c := range latestCats {
					if c.ID == catStr || strings.EqualFold(c.NameEN, catStr) || strings.EqualFold(c.NameHE, catStr) {
						matchedID := c.ID
						targetCatID = &matchedID
						targetCatNameEN = c.NameEN
						targetCatNameHE = c.NameHE
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
						targetCatNameEN = c.NameEN
						targetCatNameHE = c.NameHE
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
						targetCatNameEN = newCat.NameEN
						targetCatNameHE = newCat.NameHE
						slog.Info("Created new category suggested by LocalAI", "category_id", newCat.ID, "name_en", newCat.NameEN, "name_he", newCat.NameHE)
					}
				}
			}

			if targetCatID != nil {
				batchResp.Categorizations[itemIdx].CategoryNameEN = targetCatNameEN
				batchResp.Categorizations[itemIdx].CategoryNameHE = targetCatNameHE
				if err := s.db.UpdateTransactionCategory(item.TransactionID, targetCatID, true, models.CategorizedByLocalAI); err != nil {
					slog.Error("Failed to update transaction category", "tx_id", item.TransactionID, "cat_id", *targetCatID, "error", err)
				} else {
					slog.Info("LocalAI assigned category to transaction", "tx_id", item.TransactionID, "cat_id", *targetCatID)
				}
			} else if item.SuggestedCategory != nil {
				_, _ = s.db.Exec(`
					UPDATE transactions
					SET suggested_category_he = ?, suggested_category_en = ?, suggested_category_type = ?, categorized_by = 'LOCALAI', updated_at = CURRENT_TIMESTAMP
					WHERE id = ?
				`, item.SuggestedCategory.NameHE, item.SuggestedCategory.NameEN, item.SuggestedCategory.CategoryType, item.TransactionID)
				slog.Info("Stored category suggestion for transaction", "tx_id", item.TransactionID, "suggestion_en", item.SuggestedCategory.NameEN)
			}
		}

		s.mu.Lock()
		s.status.Processed += len(chunk)
		now := time.Now()
		if batchIndex < len(s.status.Batches) {
			s.status.Batches[batchIndex].Status = "completed"
			s.status.Batches[batchIndex].Results = batchResp.Categorizations
			s.status.Batches[batchIndex].CompletedAt = &now
		}
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

func (s *LocalAIService) FetchAvailableModels(ctx context.Context, customUrl, customApiKey string) ([]string, error) {
	url := customUrl
	if url == "" {
		url, _ = s.db.GetSetting("localai_url")
	}
	if url == "" {
		url = "http://localhost:8080"
	}

	apiKey := customApiKey
	if apiKey == "" {
		apiKey, _ = s.db.GetSetting("localai_api_key")
	}

	baseUrl := strings.TrimRight(url, "/")
	if strings.HasSuffix(baseUrl, "/chat/completions") {
		baseUrl = strings.TrimSuffix(baseUrl, "/chat/completions")
	}

	var modelsEndpoint string
	if strings.HasSuffix(baseUrl, "/v1") {
		modelsEndpoint = baseUrl + "/models"
	} else {
		modelsEndpoint = baseUrl + "/v1/models"
	}

	req, err := http.NewRequestWithContext(ctx, "GET", modelsEndpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("invalid models URL (%s): %w", modelsEndpoint, err)
	}
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		// Fallback to Ollama endpoint if /v1/models failed
		ollamaEndpoint := strings.TrimSuffix(baseUrl, "/v1") + "/api/tags"
		if reqOllama, oErr := http.NewRequestWithContext(ctx, "GET", ollamaEndpoint, nil); oErr == nil {
			if apiKey != "" {
				reqOllama.Header.Set("Authorization", "Bearer "+apiKey)
			}
			if respOllama, oDoErr := s.client.Do(reqOllama); oDoErr == nil && respOllama.StatusCode == http.StatusOK {
				defer respOllama.Body.Close()
				var ollamaResp struct {
					Models []struct {
						Name  string `json:"name"`
						Model string `json:"model"`
					} `json:"models"`
				}
				if json.NewDecoder(respOllama.Body).Decode(&ollamaResp) == nil && len(ollamaResp.Models) > 0 {
					var modelIDs []string
					for _, m := range ollamaResp.Models {
						name := m.Name
						if name == "" {
							name = m.Model
						}
						if name != "" {
							modelIDs = append(modelIDs, name)
						}
					}
					return modelIDs, nil
				}
			}
		}
		return nil, fmt.Errorf("cannot connect to models endpoint at %s: %w", modelsEndpoint, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("server at %s returned HTTP %d: %s", modelsEndpoint, resp.StatusCode, string(body))
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response from %s: %w", modelsEndpoint, err)
	}

	// Try parsing OpenAI standard list response format
	var openAIResp struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(bodyBytes, &openAIResp); err == nil && len(openAIResp.Data) > 0 {
		var modelIDs []string
		for _, item := range openAIResp.Data {
			if item.ID != "" {
				modelIDs = append(modelIDs, item.ID)
			}
		}
		if len(modelIDs) > 0 {
			return modelIDs, nil
		}
	}

	// Try parsing raw struct/array
	var arrayResp []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	if err := json.Unmarshal(bodyBytes, &arrayResp); err == nil && len(arrayResp) > 0 {
		var modelIDs []string
		for _, item := range arrayResp {
			id := item.ID
			if id == "" {
				id = item.Name
			}
			if id != "" {
				modelIDs = append(modelIDs, id)
			}
		}
		if len(modelIDs) > 0 {
			return modelIDs, nil
		}
	}

	return nil, fmt.Errorf("no models found in response from %s", modelsEndpoint)
}


