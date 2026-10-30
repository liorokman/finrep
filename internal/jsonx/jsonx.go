// Package jsonx encodes values for clients: ordinary JSON, but with Go field names converted to snake_case,
// so the REST API and the MCP tools describe data the same way.
package jsonx

import (
	"bytes"
	"encoding/json"
	"strings"
	"unicode"
)

// Marshal is json.Marshal followed by converting every object key from GoFieldName to go_field_name.
// Numbers keep their exact text, so 64-bit integers are not rounded.
func Marshal(v any) ([]byte, error) {
	raw, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var generic any
	if err := dec.Decode(&generic); err != nil {
		return raw, nil
	}
	return json.Marshal(convert(generic))
}

func convert(v any) any {
	switch x := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(x))
		for k, val := range x {
			out[Snake(k)] = convert(val)
		}
		return out
	case []any:
		for i := range x {
			x[i] = convert(x[i])
		}
		return x
	}
	return v
}

// Snake converts AccountID, NameHE and TxCount to account_id, name_he, tx_count. Names that are
// already lower-case are left alone.
func Snake(s string) string {
	if s == "" || strings.ToLower(s) == s {
		return s
	}
	rs := []rune(s)
	var b strings.Builder
	for i, r := range rs {
		if unicode.IsUpper(r) && i > 0 {
			prev := rs[i-1]
			nextLower := i+1 < len(rs) && unicode.IsLower(rs[i+1])
			if unicode.IsLower(prev) || unicode.IsDigit(prev) || (unicode.IsUpper(prev) && nextLower) {
				b.WriteByte('_')
			}
		}
		b.WriteRune(unicode.ToLower(r))
	}
	return b.String()
}
