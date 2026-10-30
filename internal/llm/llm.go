// Package llm is a minimal client for OpenAI-compatible chat endpoints (LocalAI, vLLM, OpenAI).
package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client talks to {BaseURL}/chat/completions, e.g. BaseURL "http://localai:8080/v1".
type Client struct {
	BaseURL string
	APIKey  string
	HTTP    *http.Client
}

// New returns a client with a generous per-request timeout (local models can be slow).
func New(baseURL, apiKey string) *Client {
	return &Client{BaseURL: strings.TrimRight(baseURL, "/"), APIKey: apiKey, HTTP: &http.Client{Timeout: 5 * time.Minute}}
}

type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type request struct {
	Model          string            `json:"model"`
	Messages       []message         `json:"messages"`
	Temperature    float64           `json:"temperature"`
	ResponseFormat map[string]string `json:"response_format"`
}

type response struct {
	Choices []struct {
		Message message `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

const maxBody = 4 << 20

// Chat sends one system+user exchange and returns the reply text. The model is asked for a JSON object.
func (c *Client) Chat(ctx context.Context, model, system, user string) (string, error) {
	body, err := json.Marshal(request{
		Model:          model,
		Messages:       []message{{"system", system}, {"user", user}},
		ResponseFormat: map[string]string{"type": "json_object"},
	})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
	}
	hc := c.HTTP
	if hc == nil {
		hc = http.DefaultClient
	}
	res, err := hc.Do(req)
	if err != nil {
		return "", fmt.Errorf("llm request: %w", err)
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, maxBody))
	if err != nil {
		return "", fmt.Errorf("llm read: %w", err)
	}
	var out response
	jsonErr := json.Unmarshal(raw, &out)
	if res.StatusCode/100 != 2 {
		msg := strings.TrimSpace(string(raw))
		if jsonErr == nil && out.Error != nil {
			msg = out.Error.Message
		}
		if len(msg) > 300 {
			msg = msg[:300]
		}
		return "", fmt.Errorf("llm status %d: %s", res.StatusCode, msg)
	}
	if jsonErr != nil {
		return "", fmt.Errorf("llm response is not JSON: %w", jsonErr)
	}
	if len(out.Choices) == 0 {
		return "", errors.New("llm response has no choices")
	}
	return out.Choices[0].Message.Content, nil
}
