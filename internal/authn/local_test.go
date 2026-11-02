package authn

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/liorokman/finrep/internal/store"
)

func init() { PasswordIterations = 1000 } // fast tests; the default cost is for real use

func newLocal(t *testing.T) (*Local, *store.Store) {
	t.Helper()
	st, err := store.Open(context.Background(), filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	return NewLocal(st.DB), st
}

func TestHashAndCheckPassword(t *testing.T) {
	h, err := HashPassword("correct horse battery")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(h, "correct") || !strings.HasPrefix(h, "pbkdf2-sha256$1000$") {
		t.Fatalf("unexpected hash %q", h)
	}
	if !CheckPassword("correct horse battery", h) || CheckPassword("correct horse batterz", h) || CheckPassword("", h) {
		t.Fatal("password check is wrong")
	}
	h2, _ := HashPassword("correct horse battery")
	if h == h2 {
		t.Fatal("hashes must be salted")
	}
	for _, junk := range []string{"", "plain", "pbkdf2-sha256$x$a$b", "pbkdf2-sha256$1000$!!$!!", "md5$1$a$b"} {
		if CheckPassword("x", junk) {
			t.Errorf("malformed hash %q accepted", junk)
		}
	}
}

func TestSetupOnlyOnce(t *testing.T) {
	ctx := context.Background()
	l, st := newLocal(t)
	if need, _ := l.SetupRequired(ctx); !need {
		t.Fatal("a fresh database needs setup")
	}
	if _, _, err := l.Setup(ctx, "admin", "short"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("short password: %v", err)
	}
	if _, _, err := l.Setup(ctx, "  ", "long enough password"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("blank username: %v", err)
	}
	if _, gen, err := l.Setup(ctx, " admin ", "long enough password"); err != nil || gen != 1 {
		t.Fatalf("setup: gen=%d err=%v", gen, err)
	}
	if _, _, err := l.Setup(ctx, "other", "another long password"); !errors.Is(err, ErrSetupDone) {
		t.Fatalf("second setup: %v", err)
	}
	var stored string
	if err := st.QueryRow(`SELECT username || '|' || password_hash FROM local_auth`).Scan(&stored); err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(stored, "admin|pbkdf2-sha256$") || strings.Contains(stored, "long enough") {
		t.Fatalf("stored row %q", stored)
	}
}

func TestAuthenticateAndThrottle(t *testing.T) {
	ctx := context.Background()
	l, _ := newLocal(t)
	now := time.Now()
	l.Now = func() time.Time { return now }
	if _, _, err := l.Authenticate(ctx, "ip", "admin", "whatever"); !errors.Is(err, ErrBadLogin) {
		t.Fatalf("no user yet: %v", err)
	}
	l.Setup(ctx, "admin", "long enough password")
	if u, gen, err := l.Authenticate(ctx, "ip", "admin", "long enough password"); err != nil || u.Subject != "admin" || gen != 1 {
		t.Fatalf("good login: %+v %d %v", u, gen, err)
	}
	if _, _, err := l.Authenticate(ctx, "ip", "root", "long enough password"); !errors.Is(err, ErrBadLogin) {
		t.Fatalf("wrong user: %v", err)
	}
	for i := 0; i < maxFailures; i++ {
		l.Authenticate(ctx, "attacker", "admin", "guess")
	}
	if _, _, err := l.Authenticate(ctx, "attacker", "admin", "long enough password"); !errors.Is(err, ErrTooMany) {
		t.Fatalf("throttled client with the right password: %v", err)
	}
	if _, _, err := l.Authenticate(ctx, "someone else", "admin", "long enough password"); err != nil {
		t.Fatalf("other clients are unaffected: %v", err)
	}
	now = now.Add(failureWindow + time.Second)
	if _, _, err := l.Authenticate(ctx, "attacker", "admin", "long enough password"); err != nil {
		t.Fatalf("throttle should expire: %v", err)
	}
}

func TestChangePasswordBumpsGeneration(t *testing.T) {
	ctx := context.Background()
	l, _ := newLocal(t)
	l.Setup(ctx, "admin", "long enough password")
	if _, err := l.ChangePassword(ctx, "ip", "wrong password!!", "brand new password"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("wrong current: %v", err)
	}
	if _, err := l.ChangePassword(ctx, "ip", "long enough password", "tiny"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("weak new: %v", err)
	}
	gen, err := l.ChangePassword(ctx, "ip", "long enough password", "brand new password")
	if err != nil || gen != 2 {
		t.Fatalf("change: gen=%d err=%v", gen, err)
	}
	if g, _ := l.Generation(ctx); g != 2 {
		t.Fatalf("generation %d", g)
	}
	if _, _, err := l.Authenticate(ctx, "ip", "admin", "long enough password"); !errors.Is(err, ErrBadLogin) {
		t.Fatal("old password still works")
	}
	if _, _, err := l.Authenticate(ctx, "ip", "admin", "brand new password"); err != nil {
		t.Fatal(err)
	}
}

func TestSessionSecretIsStable(t *testing.T) {
	ctx := context.Background()
	_, st := newLocal(t)
	a, err := SessionSecret(ctx, st.DB)
	if err != nil || len(a) < 32 {
		t.Fatalf("secret %q err %v", a, err)
	}
	b, _ := SessionSecret(ctx, st.DB)
	if string(a) != string(b) {
		t.Fatal("the secret must not change between calls")
	}
}
