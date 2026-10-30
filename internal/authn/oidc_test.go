package authn

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

var ctx = context.Background()

// fakeIdP is a minimal OpenID provider that signs real RS256 ID tokens and checks PKCE.
type fakeIdP struct {
	t      *testing.T
	srv    *httptest.Server
	key    *rsa.PrivateKey
	kid    string
	codes  map[string]authRequest
	mutate func(claims map[string]any) // tweak the ID token's claims
	signer *rsa.PrivateKey             // when set, sign with this key instead (a forgery)
	skipID bool
}

type authRequest struct{ nonce, challenge, redirect, clientID string }

func newIdP(t *testing.T) *fakeIdP {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	p := &fakeIdP{t: t, key: key, kid: "k1", codes: map[string]authRequest{}}
	mux := http.NewServeMux()
	mux.HandleFunc("/.well-known/openid-configuration", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{
			"issuer": p.srv.URL, "authorization_endpoint": p.srv.URL + "/authorize", "token_endpoint": p.srv.URL + "/token",
			"jwks_uri": p.srv.URL + "/jwks", "id_token_signing_alg_values_supported": []string{"RS256"},
		})
	})
	mux.HandleFunc("/jwks", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]any{{
			"kty": "RSA", "alg": "RS256", "use": "sig", "kid": p.kid,
			"n": b64(p.key.N.Bytes()), "e": b64(big.NewInt(int64(p.key.E)).Bytes()),
		}}})
	})
	mux.HandleFunc("/token", p.token)
	p.srv = httptest.NewServer(mux)
	t.Cleanup(p.srv.Close)
	return p
}

func b64(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }

func (p *fakeIdP) token(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	req, ok := p.codes[r.Form.Get("code")]
	if !ok || r.Form.Get("grant_type") != "authorization_code" {
		http.Error(w, `{"error":"invalid_grant"}`, http.StatusBadRequest)
		return
	}
	delete(p.codes, r.Form.Get("code")) // codes are single use
	sum := sha256.Sum256([]byte(r.Form.Get("code_verifier")))
	if b64(sum[:]) != req.challenge || r.Form.Get("redirect_uri") != req.redirect {
		http.Error(w, `{"error":"invalid_grant","error_description":"pkce"}`, http.StatusBadRequest)
		return
	}
	claims := map[string]any{
		"iss": p.srv.URL, "aud": req.clientID, "sub": "user-1", "email": "alice@example.com", "name": "Alice",
		"groups": []string{"Other", "FinRep_Users"}, "nonce": req.nonce, "iat": time.Now().Unix(), "exp": time.Now().Add(time.Hour).Unix(),
	}
	if p.mutate != nil {
		p.mutate(claims)
	}
	w.Header().Set("Content-Type", "application/json")
	out := map[string]any{"access_token": "at", "token_type": "Bearer"}
	if !p.skipID {
		out["id_token"] = p.sign(claims)
	}
	json.NewEncoder(w).Encode(out)
}

func (p *fakeIdP) sign(claims map[string]any) string {
	hdr, _ := json.Marshal(map[string]any{"alg": "RS256", "typ": "JWT", "kid": p.kid})
	pl, _ := json.Marshal(claims)
	in := b64(hdr) + "." + b64(pl)
	key := p.key
	if p.signer != nil {
		key = p.signer
	}
	sum := sha256.Sum256([]byte(in))
	sig, err := rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, sum[:])
	if err != nil {
		p.t.Fatal(err)
	}
	return in + "." + b64(sig)
}

type rig struct {
	t    *testing.T
	idp  *fakeIdP
	o    *OIDC
	s    *Sessions
	now  time.Time
	cbID string
}

func newRig(t *testing.T) *rig {
	t.Helper()
	idp := newIdP(t)
	s, _ := NewSessions([]byte(strings.Repeat("k", 32)))
	rg := &rig{t: t, idp: idp, s: s, cbID: "finrep"}
	o, err := NewOIDC(ctx, OIDCConfig{Issuer: idp.srv.URL, ClientID: "finrep", RedirectURL: "https://fin.example/auth/callback", RequiredGroup: "FinRep_Users"}, s)
	if err != nil {
		t.Fatal(err)
	}
	rg.o = o
	return rg
}

// start runs /auth/login and returns the flow cookie and the provider-bound parameters.
func (g *rig) start(next string) (*http.Cookie, url.Values) {
	g.t.Helper()
	rec := httptest.NewRecorder()
	g.o.Login(rec, httptest.NewRequest("GET", "/auth/login?next="+url.QueryEscape(next), nil))
	if rec.Code != http.StatusFound {
		g.t.Fatalf("login status %d", rec.Code)
	}
	loc, _ := url.Parse(rec.Header().Get("Location"))
	if !strings.HasPrefix(loc.String(), g.idp.srv.URL+"/authorize") {
		g.t.Fatalf("redirected to %s", loc)
	}
	var fc *http.Cookie
	for _, c := range rec.Result().Cookies() {
		if c.Name == flowCookie {
			fc = c
		}
	}
	if fc == nil || !fc.HttpOnly {
		g.t.Fatalf("no flow cookie: %+v", fc)
	}
	return fc, loc.Query()
}

// finish lets the "user" authenticate at the provider and calls /auth/callback.
func (g *rig) finish(fc *http.Cookie, q url.Values, state string) *httptest.ResponseRecorder {
	g.t.Helper()
	code := "code-" + RandomToken(6)
	g.idp.codes[code] = authRequest{nonce: q.Get("nonce"), challenge: q.Get("code_challenge"), redirect: q.Get("redirect_uri"), clientID: q.Get("client_id")}
	if state == "" {
		state = q.Get("state")
	}
	req := httptest.NewRequest("GET", "/auth/callback?code="+code+"&state="+url.QueryEscape(state), nil)
	if fc != nil {
		req.AddCookie(fc)
	}
	rec := httptest.NewRecorder()
	g.o.Callback(rec, req)
	return rec
}

func sessionCookie1(rec *httptest.ResponseRecorder) *http.Cookie {
	for _, c := range rec.Result().Cookies() {
		if c.Name == sessionCookie || c.Name == secureCookie {
			return c
		}
	}
	return nil
}

func TestLoginFlow(t *testing.T) {
	g := newRig(t)
	fc, q := g.start("/reports?month=2026-07")
	if q.Get("code_challenge_method") != "S256" || q.Get("code_challenge") == "" || q.Get("state") == "" || q.Get("nonce") == "" ||
		q.Get("client_id") != "finrep" || q.Get("response_type") != "code" || !strings.Contains(q.Get("scope"), "openid") {
		t.Fatalf("authorize parameters: %v", q)
	}
	rec := g.finish(fc, q, "")
	if rec.Code != http.StatusFound || rec.Header().Get("Location") != "/reports?month=2026-07" {
		t.Fatalf("%d %s %s", rec.Code, rec.Header().Get("Location"), rec.Body)
	}
	sc := sessionCookie1(rec)
	if sc == nil || !sc.HttpOnly || sc.SameSite != http.SameSiteLaxMode || sc.Path != "/" {
		t.Fatalf("session cookie: %+v", sc)
	}
	req := httptest.NewRequest("GET", "/api/v1/accounts", nil)
	req.AddCookie(sc)
	sess, ok := g.s.Load(httptest.NewRecorder(), req, false)
	if !ok || sess.Subject != "user-1" || sess.Email != "alice@example.com" || sess.CSRF == "" {
		t.Fatalf("%+v %v", sess, ok)
	}
	// The flow cookie is cleared so the callback cannot be replayed.
	cleared := false
	for _, c := range rec.Result().Cookies() {
		if c.Name == flowCookie && c.MaxAge < 0 {
			cleared = true
		}
	}
	if !cleared {
		t.Error("flow cookie not cleared")
	}
}

func TestCallbackRejections(t *testing.T) {
	cases := []struct {
		name string
		do   func(g *rig) *httptest.ResponseRecorder
		want int
	}{
		{"state mismatch", func(g *rig) *httptest.ResponseRecorder { fc, q := g.start("/"); return g.finish(fc, q, "forged") }, 400},
		{"no flow cookie", func(g *rig) *httptest.ResponseRecorder { _, q := g.start("/"); return g.finish(nil, q, "") }, 400},
		{"tampered flow cookie", func(g *rig) *httptest.ResponseRecorder {
			fc, q := g.start("/")
			fc.Value = strings.Replace(fc.Value, ".", "x.", 1)
			return g.finish(fc, q, "")
		}, 400},
		{"expired flow", func(g *rig) *httptest.ResponseRecorder {
			fc, q := g.start("/")
			g.s.Now = func() time.Time { return time.Now().Add(11 * time.Minute) }
			return g.finish(fc, q, "")
		}, 400},
		{"wrong nonce", func(g *rig) *httptest.ResponseRecorder {
			g.idp.mutate = func(c map[string]any) { c["nonce"] = "other" }
			fc, q := g.start("/")
			return g.finish(fc, q, "")
		}, 403},
		{"wrong audience", func(g *rig) *httptest.ResponseRecorder {
			g.idp.mutate = func(c map[string]any) { c["aud"] = "someone-else" }
			fc, q := g.start("/")
			return g.finish(fc, q, "")
		}, 403},
		{"wrong issuer", func(g *rig) *httptest.ResponseRecorder {
			g.idp.mutate = func(c map[string]any) { c["iss"] = "https://evil.example" }
			fc, q := g.start("/")
			return g.finish(fc, q, "")
		}, 403},
		{"expired token", func(g *rig) *httptest.ResponseRecorder {
			g.idp.mutate = func(c map[string]any) { c["exp"] = time.Now().Add(-time.Hour).Unix() }
			fc, q := g.start("/")
			return g.finish(fc, q, "")
		}, 403},
		{"forged signature", func(g *rig) *httptest.ResponseRecorder {
			g.idp.signer, _ = rsa.GenerateKey(rand.Reader, 2048)
			fc, q := g.start("/")
			return g.finish(fc, q, "")
		}, 403},
		{"missing subject", func(g *rig) *httptest.ResponseRecorder {
			g.idp.mutate = func(c map[string]any) { delete(c, "sub") }
			fc, q := g.start("/")
			return g.finish(fc, q, "")
		}, 403},
		{"group missing from the token", func(g *rig) *httptest.ResponseRecorder {
			g.idp.mutate = func(c map[string]any) { delete(c, "groups") }
			fc, q := g.start("/")
			return g.finish(fc, q, "")
		}, 403},
		{"member of other groups only", func(g *rig) *httptest.ResponseRecorder {
			g.idp.mutate = func(c map[string]any) { c["groups"] = []string{"Admins", "finrep_users", "FinRep_Users_Old", "FinRep"} }
			fc, q := g.start("/")
			return g.finish(fc, q, "")
		}, 403},
		{"empty group list", func(g *rig) *httptest.ResponseRecorder {
			g.idp.mutate = func(c map[string]any) { c["groups"] = []string{} }
			fc, q := g.start("/")
			return g.finish(fc, q, "")
		}, 403},
		{"groups claim of the wrong type", func(g *rig) *httptest.ResponseRecorder {
			g.idp.mutate = func(c map[string]any) { c["groups"] = 42 }
			fc, q := g.start("/")
			return g.finish(fc, q, "")
		}, 403},
		{"group named only in another claim", func(g *rig) *httptest.ResponseRecorder {
			g.idp.mutate = func(c map[string]any) { delete(c, "groups"); c["roles"] = []string{"FinRep_Users"} }
			fc, q := g.start("/")
			return g.finish(fc, q, "")
		}, 403},
		{"no id token", func(g *rig) *httptest.ResponseRecorder {
			g.idp.skipID = true
			fc, q := g.start("/")
			return g.finish(fc, q, "")
		}, 502},
		{"provider error", func(g *rig) *httptest.ResponseRecorder {
			fc, q := g.start("/")
			req := httptest.NewRequest("GET", "/auth/callback?error=access_denied&state="+q.Get("state"), nil)
			req.AddCookie(fc)
			rec := httptest.NewRecorder()
			g.o.Callback(rec, req)
			return rec
		}, 403},
		{"missing code", func(g *rig) *httptest.ResponseRecorder {
			fc, q := g.start("/")
			req := httptest.NewRequest("GET", "/auth/callback?state="+q.Get("state"), nil)
			req.AddCookie(fc)
			rec := httptest.NewRecorder()
			g.o.Callback(rec, req)
			return rec
		}, 400},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			g := newRig(t)
			rec := c.do(g)
			if rec.Code != c.want {
				t.Fatalf("status %d (%s), want %d", rec.Code, strings.TrimSpace(rec.Body.String()), c.want)
			}
			if sessionCookie1(rec) != nil {
				t.Fatal("a rejected login must not create a session")
			}
		})
	}
}

func TestCodeCannotBeReplayedAndPKCEIsEnforced(t *testing.T) {
	g := newRig(t)
	fc, q := g.start("/")
	// A code issued for a different PKCE challenge is refused by the provider.
	code := "stolen"
	g.idp.codes[code] = authRequest{nonce: q.Get("nonce"), challenge: "not-our-challenge", redirect: q.Get("redirect_uri"), clientID: "finrep"}
	req := httptest.NewRequest("GET", "/auth/callback?code="+code+"&state="+url.QueryEscape(q.Get("state")), nil)
	req.AddCookie(fc)
	rec := httptest.NewRecorder()
	g.o.Callback(rec, req)
	if rec.Code != http.StatusBadGateway || sessionCookie1(rec) != nil {
		t.Fatalf("PKCE mismatch accepted: %d", rec.Code)
	}
	// And the same code cannot be used twice.
	fc2, q2 := g.start("/")
	if rec := g.finish(fc2, q2, ""); rec.Code != 302 {
		t.Fatal(rec.Code)
	}
	for code := range g.idp.codes {
		t.Fatalf("code %s left usable", code)
	}
}

func TestSafeNext(t *testing.T) {
	for in, want := range map[string]string{
		"": "/", "/": "/", "/reports?x=1": "/reports?x=1", "//evil.example": "/", "https://evil.example": "/",
		"/\\evil.example": "/", "evil": "/", "/ok\r\nSet-Cookie: x=1": "/",
	} {
		if got := SafeNext(in); got != want {
			t.Errorf("SafeNext(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestDiscoveryFailureIsReported(t *testing.T) {
	s, _ := NewSessions([]byte(strings.Repeat("k", 32)))
	if _, err := NewOIDC(ctx, OIDCConfig{Issuer: "http://127.0.0.1:1", ClientID: "x", RedirectURL: "http://x/cb"}, s); err == nil {
		t.Fatal("expected a startup error")
	}
}

func TestGroupClaimVariants(t *testing.T) {
	ok := func(name string, mut func(c map[string]any), claim string) {
		t.Run(name, func(t *testing.T) {
			g := newRig(t)
			if claim != "" {
				s, _ := NewSessions([]byte(strings.Repeat("k", 32)))
				o, err := NewOIDC(ctx, OIDCConfig{Issuer: g.idp.srv.URL, ClientID: "finrep", RedirectURL: "https://fin.example/auth/callback",
					RequiredGroup: "FinRep_Users", GroupsClaim: claim}, s)
				if err != nil {
					t.Fatal(err)
				}
				g.o, g.s = o, s
			}
			g.idp.mutate = mut
			fc, q := g.start("/")
			if rec := g.finish(fc, q, ""); rec.Code != http.StatusFound || sessionCookie1(rec) == nil {
				t.Fatalf("status %d: %s", rec.Code, rec.Body)
			}
		})
	}
	ok("a single string", func(c map[string]any) { c["groups"] = "FinRep_Users" }, "")
	ok("first of several", func(c map[string]any) { c["groups"] = []string{"FinRep_Users", "x"} }, "")
	ok("a custom claim", func(c map[string]any) { delete(c, "groups"); c["roles"] = []string{"FinRep_Users"} }, "roles")
}

func TestRequiredGroupIsMandatory(t *testing.T) {
	g := newIdP(t)
	s, _ := NewSessions([]byte(strings.Repeat("k", 32)))
	for _, group := range []string{"", "   "} {
		if _, err := NewOIDC(ctx, OIDCConfig{Issuer: g.srv.URL, ClientID: "x", RedirectURL: "http://x/cb", RequiredGroup: group}, s); err == nil {
			t.Errorf("group %q accepted", group)
		}
	}
}
