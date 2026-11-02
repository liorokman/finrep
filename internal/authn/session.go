// Package authn implements login (OIDC authorization code with PKCE), signed sessions and CSRF checks.
package authn

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

// User is the authenticated person.
type User struct {
	Subject string `json:"sub"`
	Email   string `json:"email,omitempty"`
	Name    string `json:"name,omitempty"`
}

// Session is what a session cookie carries.
type Session struct {
	User
	CSRF    string `json:"csrf"`
	Gen     int64  `json:"gen,omitempty"` // local login only: the password generation the session was issued under
	Started int64  `json:"iat"`           // unix seconds; the session cannot be extended past Started + MaxAge
	Expires int64  `json:"exp"`
}

// Sessions issues and verifies HMAC-signed cookies.
type Sessions struct {
	secret []byte
	TTL    time.Duration // sliding window, default 24h
	MaxAge time.Duration // absolute lifetime, default 30 days
	Now    func() time.Time
}

func NewSessions(secret []byte) (*Sessions, error) {
	if len(secret) < 32 {
		return nil, errors.New("session secret must be at least 32 bytes")
	}
	return &Sessions{secret: append([]byte(nil), secret...), TTL: 24 * time.Hour, MaxAge: 30 * 24 * time.Hour, Now: time.Now}, nil
}

const (
	sessionCookie = "finrep_session"
	secureCookie  = "__Host-finrep_session"
	refreshAfter  = 5 * time.Minute
)

// seal signs a JSON value. purpose is part of the MAC, so a token made for one use is useless for another.
func (s *Sessions) seal(purpose string, v any) (string, error) {
	payload, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	p := base64.RawURLEncoding.EncodeToString(payload)
	return p + "." + s.mac(purpose, p), nil
}

func (s *Sessions) mac(purpose, payload string) string {
	h := hmac.New(sha256.New, s.secret)
	h.Write([]byte("finrep/v1/" + purpose + "/" + payload))
	return base64.RawURLEncoding.EncodeToString(h.Sum(nil))
}

var errBadToken = errors.New("invalid token")

func (s *Sessions) open(purpose, token string, v any) error {
	p, sig, ok := strings.Cut(token, ".")
	if !ok || !hmac.Equal([]byte(sig), []byte(s.mac(purpose, p))) {
		return errBadToken
	}
	raw, err := base64.RawURLEncoding.DecodeString(p)
	if err != nil {
		return errBadToken
	}
	return json.Unmarshal(raw, v)
}

// RandomToken returns n random bytes, URL-safe.
func RandomToken(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic("authn: no randomness: " + err.Error())
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

func cookieName(secure bool) string {
	if secure {
		return secureCookie
	}
	return sessionCookie
}

func (s *Sessions) set(w http.ResponseWriter, secure bool, sess *Session) error {
	tok, err := s.seal("session", sess)
	if err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name: cookieName(secure), Value: tok, Path: "/", HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode,
		Expires: time.Unix(sess.Expires, 0),
	})
	return nil
}

// Issue starts a session for a user.
func (s *Sessions) Issue(w http.ResponseWriter, secure bool, u User) (*Session, error) {
	return s.IssueGen(w, secure, u, 0)
}

// IssueGen starts a session bound to a password generation (local login).
func (s *Sessions) IssueGen(w http.ResponseWriter, secure bool, u User, gen int64) (*Session, error) {
	now := s.Now()
	sess := &Session{User: u, Gen: gen, CSRF: RandomToken(24), Started: now.Unix(), Expires: now.Add(s.TTL).Unix()}
	return sess, s.set(w, secure, sess)
}

// Load returns the valid session on a request. When more than a few minutes have passed since the
// cookie was written it is re-issued with a fresh expiry (sliding), never beyond MaxAge.
func (s *Sessions) Load(w http.ResponseWriter, r *http.Request, secure bool) (*Session, bool) {
	var raw string
	for _, name := range []string{secureCookie, sessionCookie} {
		if c, err := r.Cookie(name); err == nil {
			raw = c.Value
			break
		}
	}
	if raw == "" {
		return nil, false
	}
	var sess Session
	if err := s.open("session", raw, &sess); err != nil || sess.Subject == "" || sess.CSRF == "" {
		return nil, false
	}
	now := s.Now()
	if now.Unix() >= sess.Expires || now.Unix() >= sess.Started+int64(s.MaxAge.Seconds()) {
		return nil, false
	}
	if remaining := time.Unix(sess.Expires, 0).Sub(now); remaining < s.TTL-refreshAfter && w != nil {
		exp := now.Add(s.TTL).Unix()
		if limit := sess.Started + int64(s.MaxAge.Seconds()); exp > limit {
			exp = limit
		}
		sess.Expires = exp
		_ = s.set(w, secure, &sess)
	}
	return &sess, true
}

// Clear removes the session cookie.
func (s *Sessions) Clear(w http.ResponseWriter, secure bool) {
	http.SetCookie(w, &http.Cookie{Name: cookieName(secure), Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode})
}
