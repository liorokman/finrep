package authn

import (
	"crypto/subtle"
	"net/http"
	"net/url"
	"strings"
)

// CSRFHeader carries the session's CSRF token on state-changing requests.
const CSRFHeader = "X-CSRF-Token"

func safeMethod(m string) bool {
	return m == http.MethodGet || m == http.MethodHead || m == http.MethodOptions
}

// SameOrigin reports whether the Origin (or, failing that, Referer) of a request names the host it
// was sent to. A request with neither header is not a browser cross-site request and passes.
func SameOrigin(r *http.Request, host string) bool {
	for _, h := range []string{"Origin", "Referer"} {
		v := r.Header.Get(h)
		if v == "" {
			continue
		}
		u, err := url.Parse(v) // "null" (opaque origins) has no host and is refused here
		if err != nil || u.Host == "" {
			return false
		}
		return strings.EqualFold(u.Host, host)
	}
	return true
}

// CheckCSRF applies the rules for state-changing requests: same origin, plus (when the request is
// authenticated by a session) the session's token in the CSRFHeader. With sess == nil only the origin
// check applies, which is what the open development mode gets.
func CheckCSRF(r *http.Request, host string, sess *Session) bool {
	if safeMethod(r.Method) {
		return true
	}
	if !SameOrigin(r, host) {
		return false
	}
	if sess == nil {
		return true
	}
	got := r.Header.Get(CSRFHeader)
	return got != "" && subtle.ConstantTimeCompare([]byte(got), []byte(sess.CSRF)) == 1
}
