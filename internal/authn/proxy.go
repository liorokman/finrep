package authn

import (
	"net"
	"net/http"
	"net/netip"
	"strings"
)

// Request describes where a request really came from, honouring X-Forwarded-* only when the
// immediate peer is a trusted proxy.
type Request struct {
	ClientIP netip.Addr
	Scheme   string
	Host     string
}

func (r Request) Secure() bool { return r.Scheme == "https" }

// Inspect works out the client address, scheme and host of a request.
func Inspect(r *http.Request, trusted []netip.Prefix) Request {
	out := Request{Scheme: "http", Host: r.Host}
	if r.TLS != nil {
		out.Scheme = "https"
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	peer, err := netip.ParseAddr(host)
	if err != nil {
		return out
	}
	peer = peer.Unmap()
	out.ClientIP = peer
	fromProxy := false
	for _, p := range trusted {
		if p.Contains(peer) {
			fromProxy = true
			break
		}
	}
	if !fromProxy {
		return out
	}
	if v := strings.ToLower(strings.TrimSpace(firstValue(r.Header.Get("X-Forwarded-Proto")))); v == "https" || v == "http" {
		out.Scheme = v
	}
	if v := strings.TrimSpace(firstValue(r.Header.Get("X-Forwarded-Host"))); v != "" {
		out.Host = v
	}
	// The client is the right-most forwarded address that is not itself a trusted proxy.
	parts := strings.Split(r.Header.Get("X-Forwarded-For"), ",")
	for i := len(parts) - 1; i >= 0; i-- {
		a, err := netip.ParseAddr(strings.TrimSpace(parts[i]))
		if err != nil {
			break
		}
		a = a.Unmap()
		out.ClientIP = a
		trustedHop := false
		for _, p := range trusted {
			if p.Contains(a) {
				trustedHop = true
				break
			}
		}
		if !trustedHop {
			break
		}
	}
	return out
}

func firstValue(h string) string {
	v, _, _ := strings.Cut(h, ",")
	return v
}
