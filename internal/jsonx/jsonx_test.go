package jsonx

import "testing"

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
