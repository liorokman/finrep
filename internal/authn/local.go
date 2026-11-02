package authn

import (
	"context"
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

// Errors a caller may show to the user.
var (
	ErrBadLogin  = errors.New("wrong username or password")
	ErrSetupDone = errors.New("an admin user already exists")
	ErrTooMany   = errors.New("too many failed attempts, try again later")
	// ErrInvalid wraps validation failures (weak password, bad username); the message is safe to show.
	ErrInvalid = errors.New("invalid")
)

const (
	MinPasswordLen = 10
	maxPasswordLen = 256
	hashPrefix     = "pbkdf2-sha256"
)

// PasswordIterations is the PBKDF2 cost for new hashes (OWASP's figure for PBKDF2-HMAC-SHA256). Tests lower it.
var PasswordIterations = 600_000

func invalid(format string, a ...any) error {
	return fmt.Errorf("%w: %s", ErrInvalid, fmt.Sprintf(format, a...))
}

// HashPassword returns "pbkdf2-sha256$iterations$salt$hash".
func HashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key, err := pbkdf2.Key(sha256.New, password, salt, PasswordIterations, 32)
	if err != nil {
		return "", err
	}
	enc := base64.RawStdEncoding
	return strings.Join([]string{hashPrefix, strconv.Itoa(PasswordIterations), enc.EncodeToString(salt), enc.EncodeToString(key)}, "$"), nil
}

// CheckPassword compares a password with a stored hash in constant time.
func CheckPassword(password, stored string) bool {
	parts := strings.Split(stored, "$")
	if len(parts) != 4 || parts[0] != hashPrefix {
		return false
	}
	iter, err := strconv.Atoi(parts[1])
	if err != nil || iter < 1 || iter > 10_000_000 {
		return false
	}
	enc := base64.RawStdEncoding
	salt, err1 := enc.DecodeString(parts[2])
	want, err2 := enc.DecodeString(parts[3])
	if err1 != nil || err2 != nil || len(want) == 0 {
		return false
	}
	got, err := pbkdf2.Key(sha256.New, password, salt, iter, len(want))
	return err == nil && subtle.ConstantTimeCompare(got, want) == 1
}

func checkPasswordRules(p string) error {
	if !utf8.ValidString(p) || len(p) > maxPasswordLen {
		return invalid("the password must be text of at most %d bytes", maxPasswordLen)
	}
	if utf8.RuneCountInString(p) < MinPasswordLen {
		return invalid("the password must be at least %d characters", MinPasswordLen)
	}
	return nil
}

func cleanUsername(u string) (string, error) {
	u = strings.TrimSpace(u)
	if n := utf8.RuneCountInString(u); n < 1 || n > 64 || strings.ContainsAny(u, "\r\n\t") {
		return "", invalid("the username must be 1 to 64 characters")
	}
	return u, nil
}

// Local is password login against the single admin user in the database.
type Local struct {
	db  *sql.DB
	Now func() time.Time

	mu       sync.Mutex
	failures map[string][]time.Time // per client key
}

func NewLocal(db *sql.DB) *Local {
	return &Local{db: db, Now: time.Now, failures: map[string][]time.Time{}}
}

const (
	maxFailures   = 8
	failureWindow = 15 * time.Minute
)

// throttled reports whether key has used up its failed attempts; failed records one.
func (l *Local) throttled(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.Now()
	recent := l.failures[key][:0]
	for _, t := range l.failures[key] {
		if now.Sub(t) < failureWindow {
			recent = append(recent, t)
		}
	}
	if len(recent) == 0 {
		delete(l.failures, key)
	} else {
		l.failures[key] = recent
	}
	return len(recent) >= maxFailures
}

func (l *Local) failed(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if len(l.failures) > 10_000 { // bound memory under a flood of distinct clients
		l.failures = map[string][]time.Time{}
	}
	l.failures[key] = append(l.failures[key], l.Now())
}

// SetupRequired reports whether no admin user exists yet.
func (l *Local) SetupRequired(ctx context.Context) (bool, error) {
	var n int
	if err := l.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM local_auth`).Scan(&n); err != nil {
		return false, err
	}
	return n == 0, nil
}

// Setup creates the admin user. It succeeds only while there is none.
func (l *Local) Setup(ctx context.Context, username, password string) (User, int64, error) {
	username, err := cleanUsername(username)
	if err != nil {
		return User{}, 0, err
	}
	if err := checkPasswordRules(password); err != nil {
		return User{}, 0, err
	}
	hash, err := HashPassword(password)
	if err != nil {
		return User{}, 0, err
	}
	res, err := l.db.ExecContext(ctx, `INSERT INTO local_auth (id, username, password_hash) VALUES (1, ?, ?) ON CONFLICT(id) DO NOTHING`, username, hash)
	if err != nil {
		return User{}, 0, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return User{}, 0, ErrSetupDone
	}
	return User{Subject: username, Name: username}, 1, nil
}

// dummyHash makes a login for an unknown user cost as much as a real one.
var dummyHash, _ = HashPassword("not the password")

// Authenticate checks the credentials. key identifies the client for throttling.
func (l *Local) Authenticate(ctx context.Context, key, username, password string) (User, int64, error) {
	if l.throttled(key) {
		return User{}, 0, ErrTooMany
	}
	var name, hash string
	var gen int64
	err := l.db.QueryRowContext(ctx, `SELECT username, password_hash, generation FROM local_auth WHERE id = 1`).Scan(&name, &hash, &gen)
	if errors.Is(err, sql.ErrNoRows) {
		CheckPassword(password, dummyHash)
		l.failed(key)
		return User{}, 0, ErrBadLogin
	}
	if err != nil {
		return User{}, 0, err
	}
	okUser := subtle.ConstantTimeCompare([]byte(strings.TrimSpace(username)), []byte(name)) == 1
	okPass := CheckPassword(password, hash)
	if !okUser || !okPass {
		l.failed(key)
		return User{}, 0, ErrBadLogin
	}
	return User{Subject: name, Name: name}, gen, nil
}

// Generation is the current password generation; sessions issued under another one are void.
func (l *Local) Generation(ctx context.Context) (int64, error) {
	var gen int64
	err := l.db.QueryRowContext(ctx, `SELECT generation FROM local_auth WHERE id = 1`).Scan(&gen)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	return gen, err
}

// ChangePassword replaces the password after checking the current one, and returns the new generation.
func (l *Local) ChangePassword(ctx context.Context, key, current, next string) (int64, error) {
	if l.throttled(key) {
		return 0, ErrTooMany
	}
	if err := checkPasswordRules(next); err != nil {
		return 0, err
	}
	var hash string
	if err := l.db.QueryRowContext(ctx, `SELECT password_hash FROM local_auth WHERE id = 1`).Scan(&hash); err != nil {
		return 0, err
	}
	if !CheckPassword(current, hash) {
		l.failed(key)
		return 0, invalid("the current password is wrong")
	}
	newHash, err := HashPassword(next)
	if err != nil {
		return 0, err
	}
	var gen int64
	err = l.db.QueryRowContext(ctx, `UPDATE local_auth SET password_hash = ?, generation = generation + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1 RETURNING generation`, newHash).Scan(&gen)
	return gen, err
}

// SessionSecret returns the signing key kept in the database, creating it on first use. It is for
// installations that do not supply FINREP_SESSION_SECRET.
func SessionSecret(ctx context.Context, db *sql.DB) ([]byte, error) {
	const name = "session_secret"
	fresh := RandomToken(48)
	if _, err := db.ExecContext(ctx, `INSERT INTO app_secrets (name, value) VALUES (?, ?) ON CONFLICT(name) DO NOTHING`, name, fresh); err != nil {
		return nil, err
	}
	var v string
	if err := db.QueryRowContext(ctx, `SELECT value FROM app_secrets WHERE name = ?`, name).Scan(&v); err != nil {
		return nil, err
	}
	return []byte(v), nil
}
