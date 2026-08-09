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
		client: &http.Client{Timeout: 30 * time.Second},
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

// FixPayeeSpaces uses LocalAI to restore proper word spaces in Hebrew merchant names
func (c *LocalAIClient) FixPayeeSpaces(payee string) (string, error) {
	payee = strings.TrimSpace(payee)
	if payee == "" || !containsHebrew(payee) {
		return payee, nil
	}

	c.cacheMu.Lock()
	if cached, found := c.cache[payee]; found {
		c.cacheMu.Unlock()
		return cached, nil
	}
	c.cacheMu.Unlock()

	apiURL := strings.TrimRight(c.cfg.APIURL, "/") + "/chat/completions"
	prompt := c.cfg.Prompts.FixSpacesPrompt
	if prompt == "" {
		prompt = DefaultConfig().Prompts.FixSpacesPrompt
	}

	reqBody := chatRequest{
		Model: c.cfg.Model,
		Messages: []chatMessage{
			{Role: "system", Content: prompt},
			{Role: "user", Content: fmt.Sprintf("Fix word spacing in this merchant description: %s", payee)},
		},
		Temperature: 0.0,
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return payee, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewReader(jsonBytes))
	if err != nil {
		return payee, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if c.cfg.APIKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+c.cfg.APIKey)
	}

	resp, err := c.client.Do(httpReq)
	if err != nil {
		// Graceful fallback to original payee if API call fails
		return payee, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return payee, nil
	}

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return payee, nil
	}

	var chatResp chatResponse
	if err := json.Unmarshal(respBytes, &chatResp); err != nil || len(chatResp.Choices) == 0 {
		return payee, nil
	}

	result := strings.TrimSpace(chatResp.Choices[0].Message.Content)
	// Strip JSON wrapping if LLM returned JSON
	result = cleanLLMResponse(result, payee)

	if result != "" {
		c.cacheMu.Lock()
		c.cache[payee] = result
		c.cacheMu.Unlock()
		return result, nil
	}

	return payee, nil
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
