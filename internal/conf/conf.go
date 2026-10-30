// Package conf loads and validates runtime configuration from flags and
// environment variables (flag > FINREP_* environment variable > default).
package conf

import (
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"net/netip"
	"net/url"
	"os"
	"strconv"
	"strings"
)

// Config is the validated runtime configuration.
type Config struct {
	Port          int
	Bind          string // listen address host; defaults depend on AuthEnabled
	LogLevel      string
	Mode          string // "web" or "mcp"
	DBPath        string
	AuthEnabled   bool
	OIDCIssuer    string
	OIDCClientID  string
	OIDCRedirect  string
	SessionSecret []byte
	MCPToken      string // empty disables the HTTP MCP endpoint
	MaxUploadMB   int
	TrustedProxy  []netip.Prefix
}

// Env abstracts the process environment for tests.
type Env struct {
	Getenv   func(string) string
	ReadFile func(string) ([]byte, error)
}

// OSEnv reads the real environment and files.
func OSEnv() Env { return Env{Getenv: os.Getenv, ReadFile: os.ReadFile} }

// Load parses args (without the program name) and validates the result.
func Load(args []string, env Env, usage io.Writer) (*Config, error) {
	if env.Getenv == nil {
		env.Getenv = func(string) string { return "" }
	}
	if env.ReadFile == nil {
		env.ReadFile = os.ReadFile
	}
	var errs []error
	str := func(name, def string) string {
		if v := env.Getenv("FINREP_" + name); v != "" {
			return v
		}
		return def
	}
	num := func(name string, def int) int {
		v := env.Getenv("FINREP_" + name)
		if v == "" {
			return def
		}
		n, err := strconv.Atoi(v)
		if err != nil {
			errs = append(errs, fmt.Errorf("FINREP_%s: %q is not a number", name, v))
			return def
		}
		return n
	}
	// secret reads FINREP_<name>, or the file named by FINREP_<name>_FILE
	// (for Docker/Kubernetes secrets).
	secret := func(name string) string {
		if v := env.Getenv("FINREP_" + name); v != "" {
			return v
		}
		if f := env.Getenv("FINREP_" + name + "_FILE"); f != "" {
			b, err := env.ReadFile(f)
			if err != nil {
				errs = append(errs, fmt.Errorf("FINREP_%s_FILE: %w", name, err))
				return ""
			}
			return strings.TrimSpace(string(b))
		}
		return ""
	}

	c := &Config{}
	var auth, secretFlag, proxies string
	fs := flag.NewFlagSet("finrep", flag.ContinueOnError)
	fs.SetOutput(usage)
	fs.IntVar(&c.Port, "port", num("PORT", 8080), "HTTP listen port")
	fs.StringVar(&c.Bind, "bind", str("BIND", ""), "listen address (default 127.0.0.1 with --auth=off, 0.0.0.0 otherwise)")
	fs.StringVar(&c.LogLevel, "log-level", str("LOG_LEVEL", "info"), "debug, info, warn or error")
	fs.StringVar(&c.Mode, "mode", str("MODE", "web"), "web or mcp (stdio)")
	fs.StringVar(&c.DBPath, "db-path", str("DB_PATH", "./data/finrep.db"), "SQLite database file")
	fs.StringVar(&auth, "auth", str("AUTH", "on"), "on or off (off is for local development and requires a loopback bind)")
	fs.StringVar(&c.OIDCIssuer, "oidc-issuer", str("OIDC_ISSUER", ""), "OIDC issuer URL")
	fs.StringVar(&c.OIDCClientID, "oidc-client-id", str("OIDC_CLIENT_ID", ""), "OIDC client id")
	fs.StringVar(&c.OIDCRedirect, "oidc-redirect", str("OIDC_REDIRECT", ""), "OIDC redirect URL (…/auth/callback)")
	fs.StringVar(&secretFlag, "session-secret", "", "session signing secret, at least 32 bytes (prefer FINREP_SESSION_SECRET or _FILE)")
	fs.StringVar(&c.MCPToken, "mcp-token", "", "bearer token for HTTP MCP; empty disables it (prefer FINREP_MCP_TOKEN or _FILE)")
	fs.IntVar(&c.MaxUploadMB, "max-upload-mb", num("MAX_UPLOAD_MB", 10), "maximum upload size in MB")
	fs.StringVar(&proxies, "trusted-proxies", str("TRUSTED_PROXIES", ""), "comma-separated CIDRs allowed to set X-Forwarded-* headers")
	if err := fs.Parse(args); err != nil {
		return nil, err
	}
	sec := secretFlag
	if sec == "" {
		sec = secret("SESSION_SECRET")
	}
	if c.MCPToken == "" {
		c.MCPToken = secret("MCP_TOKEN")
	}
	c.SessionSecret = []byte(sec)
	c.LogLevel = strings.ToLower(c.LogLevel)
	c.Mode = strings.ToLower(c.Mode)

	switch strings.ToLower(auth) {
	case "on", "true":
		c.AuthEnabled = true
	case "off", "false":
		c.AuthEnabled = false
	default:
		errs = append(errs, fmt.Errorf("--auth must be on or off, got %q", auth))
	}
	if c.Bind == "" {
		if c.AuthEnabled {
			c.Bind = "0.0.0.0"
		} else {
			c.Bind = "127.0.0.1"
		}
	}
	for _, p := range strings.Split(proxies, ",") {
		if p = strings.TrimSpace(p); p == "" {
			continue
		}
		pf, err := netip.ParsePrefix(p)
		if err != nil {
			errs = append(errs, fmt.Errorf("--trusted-proxies: %w", err))
			continue
		}
		c.TrustedProxy = append(c.TrustedProxy, pf)
	}
	errs = append(errs, c.validate()...)
	if err := errors.Join(errs...); err != nil {
		return nil, err
	}
	return c, nil
}

func (c *Config) validate() []error {
	var errs []error
	add := func(format string, a ...any) { errs = append(errs, fmt.Errorf(format, a...)) }

	if c.Port < 1 || c.Port > 65535 {
		add("--port must be 1-65535, got %d", c.Port)
	}
	switch c.LogLevel {
	case "debug", "info", "warn", "error":
	default:
		add("--log-level must be debug, info, warn or error, got %q", c.LogLevel)
	}
	if c.Mode != "web" && c.Mode != "mcp" {
		add("--mode must be web or mcp, got %q", c.Mode)
	}
	if strings.TrimSpace(c.DBPath) == "" {
		add("--db-path must not be empty")
	}
	if c.MaxUploadMB < 1 || c.MaxUploadMB > 200 {
		add("--max-upload-mb must be 1-200, got %d", c.MaxUploadMB)
	}
	if c.MCPToken != "" && len(c.MCPToken) < 16 {
		add("MCP token must be at least 16 characters")
	}
	if c.Mode != "web" {
		return errs
	}
	if c.AuthEnabled {
		if len(c.SessionSecret) < 32 {
			add("with --auth=on a session secret of at least 32 bytes is required (FINREP_SESSION_SECRET)")
		}
		for name, v := range map[string]string{"--oidc-issuer": c.OIDCIssuer, "--oidc-redirect": c.OIDCRedirect} {
			u, err := url.Parse(v)
			if err != nil || u.Scheme == "" || u.Host == "" {
				add("%s must be an absolute URL, got %q", name, v)
			}
		}
		if c.OIDCClientID == "" {
			add("--oidc-client-id is required with --auth=on")
		}
	} else if !isLoopback(c.Bind) {
		add("--auth=off is only allowed on a loopback address, but --bind is %q", c.Bind)
	}
	return errs
}

func isLoopback(host string) bool {
	if host == "localhost" {
		return true
	}
	ip, err := netip.ParseAddr(strings.Trim(host, "[]"))
	return err == nil && ip.IsLoopback()
}

// Addr returns the host:port to listen on.
func (c *Config) Addr() string { return net.JoinHostPort(c.Bind, strconv.Itoa(c.Port)) }
