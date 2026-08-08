package localai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
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
			Timeout: 60 * time.Second,
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

// CategorizeBatch sends unreviewed transactions to LocalAI in batches
func (s *LocalAIService) CategorizeBatch(ctx context.Context, txs []models.Transaction) error {
	if len(txs) == 0 {
		return nil
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
		return fmt.Errorf("failed to fetch categories for LocalAI: %w", err)
	}

	// Prepare user prompt payload
	var inputBatch []map[string]interface{}
	for _, t := range txs {
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
		return err
	}

	endpoint := strings.TrimRight(url, "/") + "/v1/chat/completions"
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(jsonBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("LocalAI REST request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("LocalAI returned HTTP %d: %s", resp.StatusCode, string(body))
	}

	var chatResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return fmt.Errorf("failed to decode LocalAI response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return fmt.Errorf("empty choice array from LocalAI")
	}

	rawContent := chatResp.Choices[0].Message.Content
	cleanJSON := StripMarkdownCodeFences(rawContent)

	var batchResp LocalAIBatchResponse
	if err := json.Unmarshal([]byte(cleanJSON), &batchResp); err != nil {
		return fmt.Errorf("failed to unmarshal LocalAI categorization JSON: %w (content: %s)", err, cleanJSON)
	}

	// Apply categorizations & suggestions to database
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

	return nil
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
