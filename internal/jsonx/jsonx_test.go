package jsonx

import (
	"strings"
	"testing"
)

func TestSnake(t *testing.T) {
	for in, want := range map[string]string{
		"AccountID": "account_id", "NameHE": "name_he", "TxCount": "tx_count", "BankTxID": "bank_tx_id", "ID": "id",
		"PercentUsed": "percent_used", "name": "name", "already_snake": "already_snake", "MinRate": "min_rate", "CSRF": "csrf",
		"IsReviewed": "is_reviewed", "HasProposal": "has_proposal", "Q1": "q1", "": "",
	} {
		if got := Snake(in); got != want {
			t.Errorf("Snake(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestMarshalConvertsNestedKeysAndKeepsBigNumbers(t *testing.T) {
	type inner struct{ BankTxID string }
	v := map[string]any{"Items": []inner{{"x"}}, "Big": int64(9007199254740993), "Nested": map[string]any{"TxCount": 1}}
	b, err := Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	const want = `{"big":9007199254740993,"items":[{"bank_tx_id":"x"}],"nested":{"tx_count":1}}`
	if string(b) != want {
		t.Fatalf("%s", b)
	}
	if _, err := Marshal(make(chan int)); err == nil {
		t.Fatal("unmarshalable value accepted")
	}
}

func TestNilSlicesAreEmptyListsNotNull(t *testing.T) {
	type inner struct{ Items []int }
	type out struct {
		Months  []string
		Nested  inner
		Ptr     *inner
		NilPtr  *inner
		List    []inner
		ByName  map[string][]int
		Bytes   []byte
		Number  *int
		Untyped any
	}
	var nilInner *inner
	raw, err := Marshal(out{Ptr: &inner{}, NilPtr: nilInner, List: []inner{{}}, ByName: map[string][]int{"a": nil}, Untyped: []string(nil)})
	if err != nil {
		t.Fatal(err)
	}
	got := string(raw)
	for _, want := range []string{`"months":[]`, `"nested":{"items":[]}`, `"ptr":{"items":[]}`, `"nil_ptr":null`, `"list":[{"items":[]}]`, `"by_name":{"a":[]}`, `"bytes":null`, `"number":null`, `"untyped":[]`} {
		if !strings.Contains(got, want) {
			t.Errorf("missing %s in %s", want, got)
		}
	}
	if raw, _ := Marshal(nil); string(raw) != "null" {
		t.Errorf("nil: %s", raw)
	}
}
