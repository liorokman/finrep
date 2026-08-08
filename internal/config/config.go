package config

import (
	"flag"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port         int
	LogLevel     string
	Mode         string // "web" or "mcp"
	DBPath       string
	OIDCEnabled  bool
	OIDCIssuer   string
	OIDCClientID string
	OIDCRedirect string
}

// LoadConfig parses CLI flags with environment variable fallbacks
func LoadConfig() *Config {
	cfg := &Config{}

	flag.IntVar(&cfg.Port, "port", getEnvAsInt("PORT", 8080), "Server port")
	flag.StringVar(&cfg.LogLevel, "log-level", getEnv("LOG_LEVEL", "info"), "Log level: debug, info, warn, error")
	flag.StringVar(&cfg.Mode, "mode", getEnv("MODE", "web"), "Operation mode: web or mcp")
	flag.StringVar(&cfg.DBPath, "db-path", getEnv("DB_PATH", "./data/finrep.db"), "Path to SQLite database file")
	flag.BoolVar(&cfg.OIDCEnabled, "oidc-enabled", getEnvAsBool("OIDC_ENABLED", true), "Enable OIDC PKCE authentication")
	flag.StringVar(&cfg.OIDCIssuer, "oidc-issuer", getEnv("OIDC_ISSUER", "https://auth.example.com/application/o/finrep/"), "OIDC Issuer URL (Authentik)")
	flag.StringVar(&cfg.OIDCClientID, "oidc-client-id", getEnv("OIDC_CLIENT_ID", "finrep-app"), "OIDC Client ID")
	flag.StringVar(&cfg.OIDCRedirect, "oidc-redirect", getEnv("OIDC_REDIRECT", "http://localhost:8080/auth/callback"), "OIDC Redirect URL")

	// Allow flags to be parsed if not already parsed
	if !flag.Parsed() {
		flag.Parse()
	}

	cfg.LogLevel = strings.ToLower(cfg.LogLevel)
	cfg.Mode = strings.ToLower(cfg.Mode)

	return cfg
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}

func getEnvAsInt(key string, defaultVal int) int {
	if valStr, ok := os.LookupEnv(key); ok && valStr != "" {
		if val, err := strconv.Atoi(valStr); err == nil {
			return val
		}
	}
	return defaultVal
}

func getEnvAsBool(key string, defaultVal bool) bool {
	if valStr, ok := os.LookupEnv(key); ok && valStr != "" {
		if val, err := strconv.ParseBool(valStr); err == nil {
			return val
		}
	}
	return defaultVal
}
