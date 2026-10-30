package api

import (
	"crypto/tls"
	"errors"
)

var tlsState = tls.ConnectionState{}

var errSecret = errors.New("database exploded: SECRET path /var/lib/x")
