// Package jsonx encodes values for clients: ordinary JSON, but with Go field names converted to snake_case,
// so the REST API and the MCP tools describe data the same way.
package jsonx

import (
	"bytes"
	"encoding/json"
	"reflect"
	"strings"
	"unicode"
)

// Marshal is json.Marshal followed by converting every object key from GoFieldName to go_field_name.
// Numbers keep their exact text, so 64-bit integers are not rounded. A nil slice is written as [], never
// null, so a client can always treat a list as a list (a period with no data is an empty list).
func Marshal(v any) ([]byte, error) {
	raw, err := json.Marshal(nonNil(reflect.ValueOf(v)).Interface())
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

var marshaler = reflect.TypeOf((*json.Marshaler)(nil)).Elem()

// nonNil returns v with every nil slice (including inside structs, maps, pointers and other slices) replaced by
// an empty one. The input is not modified. Byte slices and types that marshal themselves are left alone.
func nonNil(v reflect.Value) reflect.Value {
	if !v.IsValid() {
		return reflect.ValueOf((*struct{})(nil))
	}
	t := v.Type()
	if t.Implements(marshaler) || reflect.PointerTo(t).Implements(marshaler) {
		return v
	}
	switch v.Kind() {
	case reflect.Slice:
		if t.Elem().Kind() == reflect.Uint8 {
			return v
		}
		out := reflect.MakeSlice(t, v.Len(), v.Len())
		for i := 0; i < v.Len(); i++ {
			out.Index(i).Set(nonNil(v.Index(i)))
		}
		return out
	case reflect.Map:
		if v.IsNil() {
			return v
		}
		out := reflect.MakeMapWithSize(t, v.Len())
		for _, k := range v.MapKeys() {
			out.SetMapIndex(k, nonNil(v.MapIndex(k)))
		}
		return out
	case reflect.Pointer:
		if v.IsNil() {
			return v
		}
		out := reflect.New(t.Elem())
		out.Elem().Set(nonNil(v.Elem()))
		return out
	case reflect.Interface:
		if v.IsNil() {
			return v
		}
		out := reflect.New(t).Elem()
		out.Set(nonNil(v.Elem()))
		return out
	case reflect.Struct:
		out := reflect.New(t).Elem()
		out.Set(v) // keeps unexported fields as they are
		for i := 0; i < t.NumField(); i++ {
			if f := out.Field(i); f.CanSet() {
				f.Set(nonNil(v.Field(i)))
			}
		}
		return out
	}
	return v
}
