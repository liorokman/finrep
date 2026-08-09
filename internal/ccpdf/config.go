package ccpdf

import (
	"encoding/json"
	"fmt"
	"os"
)

// Config represents LocalAI and prompt configuration for ccpdf2csv
type Config struct {
	APIURL  string        `json:"api_url"`
	APIKey  string        `json:"api_key"`
	Model   string        `json:"model"`
	Prompts PromptsConfig `json:"prompts"`
}

type PromptsConfig struct {
	FixSpacesPrompt      string `json:"fix_spaces_prompt"`
	ExtractBillingPrompt string `json:"extract_billing_prompt"`
}

// DefaultConfig returns default configuration values
func DefaultConfig() *Config {
	return &Config{
		APIURL: "http://localhost:8080/v1",
		APIKey: "sk-localai-key",
		Model:  "gpt-4o",
		Prompts: PromptsConfig{
			FixSpacesPrompt:      "You are a Hebrew text correction assistant for credit card statements. Fix missing spaces between Hebrew words in merchant names. Return ONLY a JSON object mapping raw payees to cleaned payees: {\"raw_payee\": \"cleaned payee\"}",
			ExtractBillingPrompt: "You are a financial statement analyzer. Extract billing dates for credit card statement transactions. Return ONLY JSON.",
		},
	}
}

// LoadConfig reads configuration from a JSON file path. If file does not exist, returns (nil, nil)
func LoadConfig(path string) (*Config, error) {
	if path == "" {
		path = "ccpdf.json"
	}
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return nil, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file '%s': %w", path, err)
	}

	cfg := DefaultConfig()
	if err := json.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config JSON in '%s': %w", path, err)
	}

	return cfg, nil
}

// GenerateExampleConfig writes a sample ccpdf.json configuration file
func GenerateExampleConfig(path string) error {
	if path == "" {
		path = "ccpdf.json"
	}

	cfg := DefaultConfig()
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal example config: %w", err)
	}

	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file '%s': %w", path, err)
	}

	return nil
}
