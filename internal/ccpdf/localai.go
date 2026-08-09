package ccpdf

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

type LocalAIClient struct {
	cfg     *Config
	client  *http.Client
	cache   map[string]string
	cacheMu sync.Mutex
}

func NewLocalAIClient(cfg *Config) *LocalAIClient {
	if cfg == nil {
		cfg = DefaultConfig()
	}
	return &LocalAIClient{
		cfg:    cfg,
		client: &http.Client{},
		cache:  make(map[string]string),
	}
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
}

type chatResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
}

// FixPayeeSpacesBatch queries LocalAI in deduplicated batches of 5-15 items per request
func (c *LocalAIClient) FixPayeeSpacesBatch(payees []string) (map[string]string, error) {
	resultMap := make(map[string]string)
	seenPayees := make(map[string]bool)
	var toFetch []string

	c.cacheMu.Lock()
	for _, p := range payees {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		if cached, found := c.cache[p]; found {
			resultMap[p] = cached
		} else if containsHebrew(p) {
			if !seenPayees[p] {
				seenPayees[p] = true
				toFetch = append(toFetch, p)
			}
		} else {
			resultMap[p] = p
		}
	}
	c.cacheMu.Unlock()

	if len(toFetch) == 0 {
		return resultMap, nil
	}

	batchSize := c.cfg.BatchSize
	if batchSize < 5 || batchSize > 15 {
		batchSize = 10
	}

	timeoutSec := c.cfg.BatchTimeoutSeconds
	if timeoutSec <= 0 {
		timeoutSec = 120
	}

	apiURL := strings.TrimRight(c.cfg.APIURL, "/") + "/chat/completions"
	prompt := c.cfg.Prompts.FixSpacesPrompt
	if prompt == "" {
		prompt = DefaultConfig().Prompts.FixSpacesPrompt
	}

	for i := 0; i < len(toFetch); i += batchSize {
		end := i + batchSize
		if end > len(toFetch) {
			end = len(toFetch)
		}
		chunk := toFetch[i:end]

		payeesJSON, _ := json.Marshal(chunk)
		userContent := fmt.Sprintf("Fix word spacing for each merchant description in this JSON array:\n%s\nReturn ONLY a JSON object mapping raw payees to cleaned payees.", string(payeesJSON))

		reqBody := chatRequest{
			Model: c.cfg.Model,
			Messages: []chatMessage{
				{Role: "system", Content: prompt},
				{Role: "user", Content: userContent},
			},
			Temperature: 0.0,
		}

		jsonBytes, err := json.Marshal(reqBody)
		if err != nil {
			continue
		}

		ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSec)*time.Second)

		httpReq, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewReader(jsonBytes))
		if err != nil {
			cancel()
			continue
		}
		httpReq.Header.Set("Content-Type", "application/json")
		if c.cfg.APIKey != "" {
			httpReq.Header.Set("Authorization", "Bearer "+c.cfg.APIKey)
		}

		resp, err := c.client.Do(httpReq)
		if err != nil {
			cancel()
			continue
		}

		if resp.StatusCode == http.StatusOK {
			if respBytes, err := io.ReadAll(resp.Body); err == nil {
				var chatResp chatResponse
				if err := json.Unmarshal(respBytes, &chatResp); err == nil && len(chatResp.Choices) > 0 {
					rawResult := chatResp.Choices[0].Message.Content
					cleanJSON := stripMarkdownFences(rawResult)
					var fetchedMap map[string]string
					if err := json.Unmarshal([]byte(cleanJSON), &fetchedMap); err == nil && len(fetchedMap) > 0 {
						c.cacheMu.Lock()
						for raw, cleaned := range fetchedMap {
							cleaned = strings.TrimSpace(cleaned)
							if cleaned != "" {
								c.cache[raw] = cleaned
								resultMap[raw] = cleaned
							}
						}
						c.cacheMu.Unlock()
					}
				}
			}
		}
		resp.Body.Close()
		cancel()
	}

	return resultMap, nil
}

// FixPayeeSpaces uses LocalAI to restore proper word spaces in a single Hebrew merchant name
func (c *LocalAIClient) FixPayeeSpaces(payee string) (string, error) {
	payee = strings.TrimSpace(payee)
	if payee == "" || !containsHebrew(payee) {
		return payee, nil
	}

	m, err := c.FixPayeeSpacesBatch([]string{payee})
	if err == nil {
		if cleaned, ok := m[payee]; ok && cleaned != "" {
			return cleaned, nil
		}
	}

	return payee, nil
}

func stripMarkdownFences(s string) string {
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

func containsHebrew(s string) bool {
	for _, r := range s {
		if (r >= 0x0590 && r <= 0x05FF) || (r >= 0xFB1D && r <= 0xFB4F) {
			return true
		}
	}
	return false
}

func cleanLLMResponse(respStr, original string) string {
	respStr = strings.TrimSpace(respStr)
	respStr = strings.Trim(respStr, "\"`'")

	// If JSON object returned, try parsing
	if strings.HasPrefix(respStr, "{") && strings.HasSuffix(respStr, "}") {
		var m map[string]string
		if err := json.Unmarshal([]byte(respStr), &m); err == nil {
			if val, ok := m[original]; ok && val != "" {
				return val
			}
			for _, v := range m {
				if v != "" {
					return v
				}
			}
		}
	}

	return respStr
}
