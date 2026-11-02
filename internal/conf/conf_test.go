package conf

import (
	"errors"
	"io"
	"strings"
	"testing"
)

func env(m map[string]string) Env {
	return Env{
		Getenv: func(k string) string { return m[k] },
		ReadFile: func(p string) ([]byte, error) {
			if v, ok := m["file:"+p]; ok {
				return []byte(v + "\n"), nil
			}
			return nil, errors.New("no such file")
		},
	}
}

var secret32 = strings.Repeat("s", 32)

var authOn = []string{"--oidc-issuer=https://auth.example/app/o/finrep/", "--oidc-client-id=finrep",
	"--oidc-redirect=https://fin.example/auth/callback"}

func load(t *testing.T, e map[string]string, args ...string) (*Config, error) {
	t.Helper()
	return Load(args, env(e), io.Discard)
}

func TestAuthOnRequiresSecret(t *testing.T) {
	_, err := load(t, nil, authOn...)
	if err == nil || !strings.Contains(err.Error(), "session secret") {
		t.Fatalf("want session secret error, got %v", err)
	}
	c, err := load(t, map[string]string{"FINREP_SESSION_SECRET": secret32}, authOn...)
	if err != nil {
		t.Fatal(err)
	}
	if c.Bind != "0.0.0.0" || c.Addr() != "0.0.0.0:8080" {
		t.Fatalf("bind = %q addr = %q", c.Bind, c.Addr())
	}
}

func TestShortSecretRejected(t *testing.T) {
	_, err := load(t, map[string]string{"FINREP_SESSION_SECRET": "short"}, authOn...)
	if err == nil {
		t.Fatal("expected error for short secret")
	}
}

func TestSecretFromFile(t *testing.T) {
	c, err := load(t, map[string]string{"FINREP_SESSION_SECRET_FILE": "/run/s", "file:/run/s": secret32}, authOn...)
	if err != nil {
		t.Fatal(err)
	}
	if string(c.SessionSecret) != secret32 {
		t.Fatalf("secret = %q", c.SessionSecret)
	}
}

func TestAuthOffDefaultsToLoopback(t *testing.T) {
	c, err := load(t, nil, "--auth=off")
	if err != nil {
		t.Fatal(err)
	}
	if c.Bind != "127.0.0.1" {
		t.Fatalf("bind = %q", c.Bind)
	}
}

func TestAuthOffRejectsPublicBind(t *testing.T) {
	for _, b := range []string{"0.0.0.0", "192.168.1.5", "::"} {
		if _, err := load(t, nil, "--auth=off", "--bind="+b); err == nil {
			t.Errorf("bind %s should be rejected with auth off", b)
		}
	}
	for _, b := range []string{"127.0.0.1", "::1", "localhost"} {
		if _, err := load(t, nil, "--auth=off", "--bind="+b); err != nil {
			t.Errorf("bind %s should be accepted: %v", b, err)
		}
	}
}

func TestPrecedenceFlagOverEnv(t *testing.T) {
	c, err := load(t, map[string]string{"FINREP_PORT": "9000"}, "--auth=off")
	if err != nil || c.Port != 9000 {
		t.Fatalf("env port: %v %v", c, err)
	}
	c, err = load(t, map[string]string{"FINREP_PORT": "9000"}, "--auth=off", "--port=9100")
	if err != nil || c.Port != 9100 {
		t.Fatalf("flag port: %v %v", c, err)
	}
}

func TestValidationErrorsAreAggregated(t *testing.T) {
	_, err := load(t, nil, "--auth=off", "--port=0", "--log-level=loud", "--mode=x", "--max-upload-mb=0")
	if err == nil {
		t.Fatal("expected errors")
	}
	for _, want := range []string{"--port", "--log-level", "--mode", "--max-upload-mb"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("missing %q in %v", want, err)
		}
	}
}

func TestMCPModeSkipsWebAuthChecks(t *testing.T) {
	if _, err := load(t, nil, "--mode=mcp"); err != nil {
		t.Fatalf("mcp stdio mode should not need web auth settings: %v", err)
	}
}

func TestMCPTokenMinimumLength(t *testing.T) {
	if _, err := load(t, nil, "--auth=off", "--mcp-token=short"); err == nil {
		t.Fatal("short token accepted")
	}
	c, err := load(t, map[string]string{"FINREP_MCP_TOKEN": "0123456789abcdef"}, "--auth=off")
	if err != nil || c.MCPToken == "" {
		t.Fatalf("token: %v %v", c, err)
	}
}

func TestTrustedProxies(t *testing.T) {
	c, err := load(t, nil, "--auth=off", "--trusted-proxies=10.0.0.0/8, 192.168.0.0/16")
	if err != nil || len(c.TrustedProxy) != 2 {
		t.Fatalf("%v %v", c, err)
	}
	if _, err := load(t, nil, "--auth=off", "--trusted-proxies=nonsense"); err == nil {
		t.Fatal("bad CIDR accepted")
	}
}

func TestOIDCClientSecretIsOptionalAndFromFile(t *testing.T) {
	c, err := load(t, map[string]string{"FINREP_SESSION_SECRET": secret32}, authOn...)
	if err != nil || c.OIDCSecret != "" {
		t.Fatalf("public client: %q %v", c.OIDCSecret, err)
	}
	c, err = load(t, map[string]string{"FINREP_SESSION_SECRET": secret32, "FINREP_OIDC_CLIENT_SECRET_FILE": "/run/o", "file:/run/o": "shh"}, authOn...)
	if err != nil || c.OIDCSecret != "shh" {
		t.Fatalf("%q %v", c.OIDCSecret, err)
	}
}

func TestRequiredGroupDefaultsAndIsMandatory(t *testing.T) {
	c, err := load(t, map[string]string{"FINREP_SESSION_SECRET": secret32}, authOn...)
	if err != nil || c.OIDCGroup != "FinRep_Users" || c.OIDCGroupsClaim != "groups" {
		t.Fatalf("%+v %v", c, err)
	}
	c, err = load(t, map[string]string{"FINREP_SESSION_SECRET": secret32, "FINREP_OIDC_REQUIRED_GROUP": "Family", "FINREP_OIDC_GROUPS_CLAIM": "roles"}, authOn...)
	if err != nil || c.OIDCGroup != "Family" || c.OIDCGroupsClaim != "roles" {
		t.Fatalf("%+v %v", c, err)
	}
	for _, arg := range []string{"--oidc-required-group=", "--oidc-required-group=  ", "--oidc-groups-claim="} {
		if _, err := load(t, map[string]string{"FINREP_SESSION_SECRET": secret32}, append([]string{arg}, authOn...)...); err == nil {
			t.Errorf("%s accepted", arg)
		}
	}
	// Open development mode has no login, so no group is needed.
	if _, err := load(t, nil, "--auth=off"); err != nil {
		t.Errorf("auth off: %v", err)
	}
}

func TestLocalAuth(t *testing.T) {
	c, err := load(t, nil, "--auth=local")
	if err != nil {
		t.Fatalf("local auth needs no OIDC settings or session secret: %v", err)
	}
	if !c.LocalAuth || c.AuthEnabled || c.Bind != "0.0.0.0" {
		t.Fatalf("%+v", c)
	}
	if _, err := load(t, map[string]string{"FINREP_SESSION_SECRET": "short"}, "--auth=local"); err == nil {
		t.Error("a short session secret should be refused")
	}
	if c, err := load(t, map[string]string{"FINREP_SESSION_SECRET": secret32}, "--auth=local", "--bind=192.168.1.5"); err != nil || len(c.SessionSecret) != 32 {
		t.Errorf("a configured secret and a LAN bind should be fine: %v", err)
	}
}
