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
)

// Choose asks a LocalAI decision model (POST /v1/systemone) to pick one option for a text. criteria maps
// each option key to a description. It returns the chosen key and the model's probability for it, which is
// what a confidence threshold should be compared with. The model does not generate text; it scores the options.
func (c *Client) Choose(ctx context.Context, model, state, instructions string, criteria map[string]string) (string, float64, error) {
	if strings.TrimSpace(state) == "" {
		return "", 0, errors.New("decision state is empty")
	}
	body, err := json.Marshal(map[string]any{
		"model": model, "state": state,
		"questions": map[string]any{"choice": map[string]any{"type": "choice", "instructions": instructions, "criteria": criteria}},
	})
	if err != nil {
		return "", 0, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/systemone", bytes.NewReader(body))
	if err != nil {
		return "", 0, err
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
		return "", 0, fmt.Errorf("decision request: %w", err)
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, maxBody))
	if err != nil {
		return "", 0, fmt.Errorf("decision read: %w", err)
	}
	var out struct {
		Answers map[string]struct {
			Choice        string             `json:"choice"`
			Probabilities map[string]float64 `json:"probabilities"`
			Confidence    float64            `json:"confidence"`
		} `json:"answers"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	jsonErr := json.Unmarshal(raw, &out)
	if res.StatusCode/100 != 2 {
		msg := strings.TrimSpace(string(raw))
		if jsonErr == nil && out.Error != nil {
			msg = out.Error.Message
		}
		if len(msg) > 300 {
			msg = msg[:300]
		}
		return "", 0, &StatusError{Code: res.StatusCode, Msg: msg}
	}
	if jsonErr != nil {
		return "", 0, fmt.Errorf("decision response is not JSON: %w", jsonErr)
	}
	a, ok := out.Answers["choice"]
	if !ok || a.Choice == "" {
		return "", 0, errors.New("decision response has no answer")
	}
	if _, known := criteria[a.Choice]; !known {
		return "", 0, fmt.Errorf("decision model answered %q, which is not an option", a.Choice)
	}
	p, ok := a.Probabilities[a.Choice]
	if !ok {
		p = a.Confidence // some models report only a confidence
	}
	return a.Choice, p, nil
}

// StatusError is a decision request the server answered with a non-2xx status.
type StatusError struct {
	Code int
	Msg  string
}

func (e *StatusError) Error() string { return fmt.Sprintf("decision status %d: %s", e.Code, e.Msg) }
