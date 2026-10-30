package authn

import (
	"net/http"
	"net/http/httptest"
	"net/netip"
	"strings"
	"testing"
	"time"
)

func newSessions(t *testing.T) (*Sessions, *time.Time) {
	t.Helper()
	s, err := NewSessions([]byte(strings.Repeat("k", 32)))
	if err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 7, 1, 12, 0, 0, 0, time.UTC)
	s.Now = func() time.Time { return now }
	return s, &now
}

func issue(t *testing.T, s *Sessions, secure bool) *http.Cookie {
	t.Helper()
	rec := httptest.NewRecorder()
	if _, err := s.Issue(rec, secure, User{Subject: "u1", Email: "a@b"}); err != nil {
		t.Fatal(err)
	}
	return rec.Result().Cookies()[0]
}

func load(s *Sessions, c *http.Cookie, w http.ResponseWriter) (*Session, bool) {
	r := httptest.NewRequest("GET", "/", nil)
	if c != nil {
		r.AddCookie(c)
	}
	return s.Load(w, r, c != nil && c.Secure)
}

func TestSessionRoundTripAndCookieAttributes(t *testing.T) {
	s, _ := newSessions(t)
	c := issue(t, s, true)
	if c.Name != "__Host-finrep_session" || !c.Secure || !c.HttpOnly || c.SameSite != http.SameSiteLaxMode || c.Path != "/" || c.Domain != "" {
		t.Fatalf("%+v", c)
	}
	sess, ok := load(s, c, httptest.NewRecorder())
	if !ok || sess.Subject != "u1" || sess.Email != "a@b" {
		t.Fatal(sess, ok)
	}
	if plain := issue(t, s, false); plain.Name != "finrep_session" || plain.Secure {
		t.Fatalf("%+v", plain)
	}
}

func TestForgedAndTamperedSessions(t *testing.T) {
	s, _ := newSessions(t)
	c := issue(t, s, false)
	other, _ := NewSessions([]byte(strings.Repeat("z", 32)))
	other.Now = s.Now
	if _, ok := load(other, c, nil); ok {
		t.Error("a cookie signed with another secret was accepted")
	}
	payload, sig, _ := strings.Cut(c.Value, ".")
	for name, v := range map[string]string{
		"altered payload": payload[:len(payload)-2] + "AA." + sig,
		"no signature":    payload,
		"empty signature": payload + ".",
		"garbage":         "not-a-cookie",
		"swapped":         sig + "." + payload,
	} {
		if _, ok := load(s, &http.Cookie{Name: c.Name, Value: v}, nil); ok {
			t.Errorf("%s accepted", name)
		}
	}
	// A token sealed for another purpose (the login flow) is not a session.
	tok, _ := s.seal("oidc-flow", Session{User: User{Subject: "attacker"}, CSRF: "x", Expires: s.Now().Add(time.Hour).Unix(), Started: s.Now().Unix()})
	if _, ok := load(s, &http.Cookie{Name: c.Name, Value: tok}, nil); ok {
		t.Error("cross-purpose token accepted")
	}
	if _, err := NewSessions([]byte("short")); err == nil {
		t.Error("short secret accepted")
	}
}

func TestSessionExpiryAndSlidingRefresh(t *testing.T) {
	s, now := newSessions(t)
	c := issue(t, s, false)
	// Within five minutes nothing is rewritten.
	*now = now.Add(2 * time.Minute)
	rec := httptest.NewRecorder()
	if _, ok := load(s, c, rec); !ok || len(rec.Result().Cookies()) != 0 {
		t.Fatal("unexpected refresh")
	}
	// After an hour the cookie is re-issued with a new 24h expiry.
	*now = now.Add(time.Hour)
	rec = httptest.NewRecorder()
	sess, ok := load(s, c, rec)
	if !ok || len(rec.Result().Cookies()) != 1 {
		t.Fatal("expected a refreshed cookie")
	}
	if got := time.Unix(sess.Expires, 0); !got.Equal(now.Add(24 * time.Hour)) {
		t.Fatalf("expiry %s", got)
	}
	refreshed := rec.Result().Cookies()[0]
	// The old cookie dies at its original expiry; the refreshed one lives on.
	*now = now.Add(23 * time.Hour)
	if _, ok := load(s, c, nil); ok {
		t.Error("original cookie should have expired")
	}
	if _, ok := load(s, refreshed, nil); !ok {
		t.Error("refreshed cookie should still be valid")
	}
	// Sliding stops at the absolute lifetime.
	cur := refreshed
	rec = httptest.NewRecorder()
	if _, ok := load(s, cur, rec); ok && len(rec.Result().Cookies()) == 1 {
		cur = rec.Result().Cookies()[0]
	}
	for i := 0; i < 80; i++ {
		*now = now.Add(20 * time.Hour)
		rec = httptest.NewRecorder()
		if _, ok := load(s, cur, rec); !ok {
			break
		}
		if cs := rec.Result().Cookies(); len(cs) == 1 {
			cur = cs[0]
		}
	}
	if _, ok := load(s, cur, nil); ok {
		t.Error("a session must not outlive MaxAge")
	}
	if start := time.Date(2026, 7, 1, 12, 0, 0, 0, time.UTC); now.Sub(start) < s.MaxAge {
		t.Errorf("loop ended early: %s", now)
	}
}

func TestClear(t *testing.T) {
	s, _ := newSessions(t)
	rec := httptest.NewRecorder()
	s.Clear(rec, true)
	c := rec.Result().Cookies()[0]
	if c.Name != "__Host-finrep_session" || c.MaxAge >= 0 || c.Value != "" {
		t.Fatalf("%+v", c)
	}
}

func TestCSRF(t *testing.T) {
	sess := &Session{CSRF: "tok123"}
	mk := func(method string, hdr map[string]string) *http.Request {
		r := httptest.NewRequest(method, "https://fin.example/api/v1/x", nil)
		for k, v := range hdr {
			r.Header.Set(k, v)
		}
		return r
	}
	const host = "fin.example"
	cases := []struct {
		name string
		r    *http.Request
		sess *Session
		want bool
	}{
		{"GET needs nothing", mk("GET", nil), sess, true},
		{"POST without token", mk("POST", map[string]string{"Origin": "https://fin.example"}), sess, false},
		{"POST wrong token", mk("POST", map[string]string{"Origin": "https://fin.example", CSRFHeader: "nope"}), sess, false},
		{"POST right token, same origin", mk("POST", map[string]string{"Origin": "https://fin.example", CSRFHeader: "tok123"}), sess, true},
		{"POST right token, other origin", mk("POST", map[string]string{"Origin": "https://evil.example", CSRFHeader: "tok123"}), sess, false},
		{"POST right token, null origin", mk("POST", map[string]string{"Origin": "null", CSRFHeader: "tok123"}), sess, false},
		{"POST right token, referer of another site", mk("DELETE", map[string]string{"Referer": "https://evil.example/p", CSRFHeader: "tok123"}), sess, false},
		{"POST right token, same-site referer", mk("PATCH", map[string]string{"Referer": "https://fin.example/p", CSRFHeader: "tok123"}), sess, true},
		{"no browser headers, token ok", mk("POST", map[string]string{CSRFHeader: "tok123"}), sess, true},
		{"open mode: same origin", mk("POST", map[string]string{"Origin": "https://fin.example"}), nil, true},
		{"open mode: cross origin", mk("POST", map[string]string{"Origin": "https://evil.example"}), nil, false},
		{"empty token never matches", mk("POST", nil), &Session{CSRF: ""}, false},
	}
	for _, c := range cases {
		if got := CheckCSRF(c.r, host, c.sess); got != c.want {
			t.Errorf("%s: got %v want %v", c.name, got, c.want)
		}
	}
}

func TestInspectTrustsForwardedHeadersOnlyFromProxies(t *testing.T) {
	trusted := []netip.Prefix{netip.MustParsePrefix("10.0.0.0/8")}
	mk := func(remote string) *http.Request {
		r := httptest.NewRequest("GET", "http://internal/", nil)
		r.RemoteAddr = remote
		r.Header.Set("X-Forwarded-Proto", "https")
		r.Header.Set("X-Forwarded-Host", "fin.example")
		r.Header.Set("X-Forwarded-For", "203.0.113.9, 10.1.1.1")
		return r
	}
	got := Inspect(mk("10.2.3.4:5555"), trusted)
	if !got.Secure() || got.Host != "fin.example" || got.ClientIP.String() != "203.0.113.9" {
		t.Fatalf("%+v", got)
	}
	got = Inspect(mk("198.51.100.7:5555"), trusted)
	if got.Secure() || got.Host != "internal" || got.ClientIP.String() != "198.51.100.7" {
		t.Fatalf("headers from an untrusted peer were honoured: %+v", got)
	}
	// A client cannot hide behind a spoofed left-most X-Forwarded-For entry.
	r := mk("10.2.3.4:1")
	r.Header.Set("X-Forwarded-For", "1.1.1.1, 203.0.113.9, 10.9.9.9")
	if got := Inspect(r, trusted); got.ClientIP.String() != "203.0.113.9" {
		t.Fatalf("%+v", got)
	}
}

func TestAbsoluteLifetimeAndEmptySubject(t *testing.T) {
	s, now := newSessions(t)
	c := issue(t, s, false)
	*now = now.Add(2 * time.Hour)
	s.MaxAge = time.Hour // a tightened policy applies to sessions already issued
	if _, ok := load(s, c, nil); ok {
		t.Error("a session older than MaxAge was accepted")
	}
	s.MaxAge = 30 * 24 * time.Hour
	tok, _ := s.seal("session", Session{CSRF: "x", Started: now.Unix(), Expires: now.Add(time.Hour).Unix()})
	if _, ok := load(s, &http.Cookie{Name: c.Name, Value: tok}, nil); ok {
		t.Error("a correctly signed session without a subject was accepted")
	}
}
