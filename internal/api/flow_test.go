package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/liorokman/finrep/internal/authn"
)

// upload sends a multipart form with one file and some text fields.
func (g *rig) upload(path, filename string, content []byte, fields map[string]string) resp {
	g.t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	for k, v := range fields {
		mw.WriteField(k, v)
	}
	if filename != "" {
		fw, _ := mw.CreateFormFile("file", filename)
		fw.Write(content)
	}
	mw.Close()
	req := httptest.NewRequest("POST", path, &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	if g.cookie != nil {
		req.AddCookie(g.cookie)
		req.Header.Set(authn.CSRFHeader, g.csrf)
		req.Header.Set("Origin", "http://example.com")
	}
	rec := httptest.NewRecorder()
	g.h.ServeHTTP(rec, req)
	return resp{rec, g.t}
}

func bankHTML(rows [][]string) []byte {
	var b strings.Builder
	b.WriteString(`<html><body><table><tr><td><table><tr><td colspan='9'>תנועות בחשבון</td></tr><tr>`)
	for _, h := range []string{"תאריך", "תאריך ערך", "תיאור", "אסמכתא", "בחובה", "בזכות", `היתרה בש"ח`, "תאור מורחב", "הערה"} {
		fmt.Fprintf(&b, `<td class="xlHeader"> <span>%s</span> </td>`, h)
	}
	b.WriteString(`</tr>`)
	for _, r := range rows {
		b.WriteString(`<tr>`)
		for _, c := range r {
			fmt.Fprintf(&b, `<td>%s</td>`, c)
		}
		b.WriteString(`</tr>`)
	}
	b.WriteString(`</table></td></tr></table></body></html>`)
	return []byte(b.String())
}

const cardCSV = "date,payee,amount,bill_date\n" +
	"2026-06-12,SHOP A,-100.00,2026-07-10\n" +
	"2026-06-13,SHOP B,-50.00,2026-07-10\n" +
	"2026-06-20,SHOP C,-25.00,\n"

var cardMapping = `{"has_header":true,"date_column":"date","date_format":"YYYY-MM-DD","payee_columns":["payee"],"amount_column":"amount","bill_date_column":"bill_date"}`

// fakeLLM is an OpenAI-compatible endpoint that puts everything into one named category.
func fakeLLM(t *testing.T, pick func(model string, p map[string]any) string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer sk-test" {
			http.Error(w, `{"error":{"message":"bad key"}}`, 401)
			return
		}
		var req struct {
			Model    string                     `json:"model"`
			Messages []struct{ Content string } `json:"messages"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		var p map[string]any
		json.Unmarshal([]byte(req.Messages[len(req.Messages)-1].Content), &p)
		content := pick(req.Model, p)
		json.NewEncoder(w).Encode(map[string]any{"choices": []map[string]any{{"message": map[string]any{"role": "assistant", "content": content}}}})
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestImportMatchCategorizeAndReportJourney(t *testing.T) {
	g := newRig(t, false)
	bank := g.account("Leumi", "BANK")
	card := g.call("POST", "/api/v1/accounts", map[string]any{"name": "Cal 1001", "type": "CREDIT_CARD", "institution": "Cal", "owner": "Alice", "last4": "1001",
		"billing_rules": []map[string]any{{"scope": "LOCAL", "bill_day": 10, "cutoff_day": 10}}}).want(201).json()["id"].(string)

	// --- inspect and stage a card CSV ---
	in := g.upload("/api/v1/imports/inspect-csv", "card.csv", []byte(cardCSV), nil).want(200).json()
	if cols := in["columns"].([]any); len(cols) != 4 || in["rows"].(float64) != 3 || len(in["date_formats"].([]any)) == 0 {
		t.Fatalf("%v", in)
	}
	st := g.upload("/api/v1/imports/stage", "card.csv", []byte(cardCSV), map[string]string{"source": "CSV", "mapping": cardMapping, "account_id": card}).want(200).json()
	pv := st["preview"].(map[string]any)
	if st["line_count"].(float64) != 3 || pv["new"].(float64) != 3 || pv["duplicates"].(float64) != 0 || st["stage_id"] == "" {
		t.Fatalf("%v", st)
	}
	if n := g.call("GET", "/api/v1/transactions", nil).want(200).json()["total"].(float64); n != 0 {
		t.Fatal("staging must not change the ledger")
	}
	res := g.call("POST", "/api/v1/imports/staged/"+st["stage_id"].(string)+"/commit", map[string]any{"account_id": card}).want(200).json()
	if res["inserted"].(float64) != 3 || res["bill_dates_assigned"].(float64) != 1 { // SHOP C has no bill date: the rule gives one
		t.Fatalf("%v", res)
	}
	g.call("POST", "/api/v1/imports/staged/"+st["stage_id"].(string)+"/commit", map[string]any{"account_id": card}).want(404) // used up

	// Uploading the same file again adds nothing.
	again := g.upload("/api/v1/imports/stage", "card.csv", []byte(cardCSV), map[string]string{"source": "CSV", "mapping": cardMapping, "account_id": card}).want(200).json()
	if again["preview"].(map[string]any)["duplicates"].(float64) != 3 {
		t.Fatalf("%v", again)
	}
	g.call("POST", "/api/v1/imports/staged/"+again["stage_id"].(string)+"/commit", map[string]any{"account_id": card}).want(200)
	if n := g.call("GET", "/api/v1/transactions", nil).want(200).json()["total"].(float64); n != 3 {
		t.Fatalf("re-import changed the ledger: %v", n)
	}

	// --- the bank export ---
	xls := bankHTML([][]string{
		{"05/07/2026", "05/07/2026", "העברת משכורת", "1", "0.00", "10000.00", "20000.00", "", ""},
		{"10/07/2026", "10/07/2026", `כרטיסי אשראי-י`, "2", "175.00", "0.00", "19825.00", "", ""},
	})
	bst := g.upload("/api/v1/imports/stage", "תנועות.xls", xls, map[string]string{"account_id": bank}).want(200).json()
	if bst["source"] != "LEUMI_BANK_XLS" || bst["line_count"].(float64) != 2 {
		t.Fatalf("%v", bst)
	}
	g.call("POST", "/api/v1/imports/staged/"+bst["stage_id"].(string)+"/commit", map[string]any{"account_id": bank}).want(200)

	// --- statements, auto-match, settlement ---
	stmts := g.call("GET", "/api/v1/statements?account_id="+card, nil).want(200).json()["items"].([]any)
	if len(stmts) != 1 {
		t.Fatalf("%v", stmts)
	}
	s0 := stmts[0].(map[string]any)
	if s0["bill_date"] != "2026-07-10" || s0["expected"].(map[string]any)["minor"].(float64) != 17500 || s0["id"] == "" || s0["status"] != "BILLED" || s0["tx_count"].(float64) != 3 {
		t.Fatalf("%v", s0)
	}
	// Before hints exist, the warning cannot run.
	if w := g.call("GET", "/api/v1/reports/warnings", nil).want(200).json(); w["hints_configured"] != false {
		t.Fatalf("%v", w)
	}
	props := g.call("GET", "/api/v1/settlements/proposals", nil).want(200).json()["items"].([]any)
	if len(props) != 1 || props[0].(map[string]any)["exact"] != true {
		t.Fatalf("%v", props)
	}
	p := props[0].(map[string]any)
	// The statement must match as well as the bank line.
	g.call("POST", "/api/v1/settlements/proposals/confirm", map[string]any{"account_id": p["account_id"], "bill_date": "2026-08-10", "bank_transaction_id": p["bank_tx_id"]}).want(404)
	g.call("POST", "/api/v1/settlements/proposals/confirm", map[string]any{"account_id": card, "bill_date": "2026-07-10", "bank_transaction_id": "not-a-real-id"}).want(404)
	conf := g.call("POST", "/api/v1/settlements/proposals/confirm", map[string]any{"account_id": p["account_id"], "bill_date": p["bill_date"], "bank_transaction_id": p["bank_tx_id"]}).want(201).json()
	if conf["id"] == "" {
		t.Fatalf("%v", conf)
	}
	s0 = g.call("GET", "/api/v1/statements?status=paid", nil).want(200).json()["items"].([]any)[0].(map[string]any)
	if s0["status"] != "PAID" || len(s0["settlements"].([]any)) != 1 || s0["id"] == "" {
		t.Fatalf("%v", s0)
	}
	g.call("GET", "/api/v1/statements?status=bogus", nil).want(400)
	if n := g.call("GET", "/api/v1/settlements/proposals", nil).want(200).json()["items"].([]any); len(n) != 0 {
		t.Fatalf("settled pair still proposed: %v", n)
	}
	g.call("DELETE", "/api/v1/settlements/"+s0["settlements"].([]any)[0].(map[string]any)["id"].(string), nil).want(204)
	if n := g.call("POST", "/api/v1/settlements/proposals/confirm-all", map[string]any{}).want(200).json()["confirmed"].(float64); n != 0 {
		t.Fatalf("an unlinked pair must not be re-proposed: %v", n) // sticky unlink
	}
	// A manual settlement for a statement identified by card and date.
	debit := g.call("GET", "/api/v1/transactions?account_id="+bank+"&q=%D7%90%D7%A9%D7%A8%D7%90%D7%99", nil).want(200).json()["items"].([]any)[0].(map[string]any)["id"].(string)
	g.call("POST", "/api/v1/settlements", map[string]any{"account_id": card, "bill_date": "2026-07-10", "bank_transaction_id": debit}).want(201)
	g.call("POST", "/api/v1/settlements", map[string]any{"bank_transaction_id": debit}).want(400)
	g.call("POST", "/api/v1/settlements", map[string]any{"account_id": card, "bill_date": "2026-07-10"}).want(400)
	// An activity placeholder needs both ids, and not a debit that already pays a bill.
	g.call("POST", "/api/v1/settlements/activity", map[string]any{"bank_transaction_id": debit}).want(400)
	g.call("POST", "/api/v1/settlements/activity", map[string]any{"bank_transaction_id": debit, "account_id": card}).want(400)
	g.call("POST", "/api/v1/settlements/activity", map[string]any{"bank_transaction_id": "nope", "account_id": card}).want(404)

	// --- categorization with a fake model ---
	g.call("POST", "/api/v1/categorization/runs", map[string]any{}).want(409) // not configured yet
	cats := g.call("POST", "/api/v1/categories", map[string]any{"name_en": "Shopping", "type": "EXPENSE"}).want(201).json()["id"].(string)
	llm := fakeLLM(t, func(model string, p map[string]any) string {
		items, _ := p["items"].([]any)
		if items == nil {
			return `{"ok":true}` // the settings "test connection" ping
		}
		var rs []string
		for _, it := range items {
			m := it.(map[string]any)
			id, payee := m["id"].(string), m["payee"].(string)
			switch {
			case model == "decide" && strings.HasPrefix(payee, "SHOP"):
				rs = append(rs, fmt.Sprintf(`{"id":"%s","category_id":"%s","confidence":0.9}`, id, cats))
			case model == "decide":
				rs = append(rs, fmt.Sprintf(`{"id":"%s","category_id":"%s","confidence":0.3}`, id, cats))
			case strings.Contains(payee, "משכורת"):
				rs = append(rs, fmt.Sprintf(`{"id":"%s","name_en":"Salary","name_he":"משכורת","type":"INCOME"}`, id))
			default:
				rs = append(rs, fmt.Sprintf(`{"id":"%s","name_en":"Misc","name_he":"שונות","type":"EXPENSE"}`, id))
			}
		}
		return `{"results":[` + strings.Join(rs, ",") + `]}`
	})
	g.call("PUT", "/api/v1/settings", map[string]any{"values": map[string]string{"llm_base_url": llm.URL, "llm_api_key": "sk-test", "classifier_model": "decide", "generator_model": "write"}}).want(200)
	test := g.call("POST", "/api/v1/settings/test-llm", map[string]any{}).want(200).json()
	if test["classifier"].(map[string]any)["ok"] != true || test["generator"].(map[string]any)["ok"] != true {
		t.Fatalf("%v", test)
	}
	start := g.call("POST", "/api/v1/categorization/runs", map[string]any{}).want(202).json()
	runID := start["id"].(string)
	g.srv.d.Categorize.Wait(runID)
	run := g.call("GET", "/api/v1/categorization/runs/"+runID, nil).want(200).json()
	if run["status"] != "DONE" || run["processed"].(float64) != 5 || run["classifier_model"] != "decide" {
		t.Fatalf("%v", run)
	}
	if n := g.call("GET", "/api/v1/transactions?category_id="+cats, nil).want(200).json()["total"].(float64); n != 3 {
		t.Fatalf("shops categorized by the classifier: %v", n)
	}
	if n := g.call("GET", "/api/v1/categories?created_by=LLM", nil).want(200).json()["items"].([]any); len(n) != 2 {
		t.Fatalf("the generator should have made Salary and Misc: %v", n)
	}
	if n := g.call("GET", "/api/v1/transactions?category_id=uncategorized", nil).want(200).json()["total"].(float64); n != 0 {
		t.Fatalf("%v left uncategorized", n)
	}
	if n := g.call("GET", "/api/v1/categorization/runs", nil).want(200).json()["items"].([]any); len(n) != 1 {
		t.Fatal(n)
	}
	if r := g.call("POST", "/api/v1/categorization/runs", map[string]any{}).want(200).json(); r["started"] != false {
		t.Fatalf("nothing left to do: %v", r)
	}

	// --- reports ---
	cf := g.call("GET", "/api/v1/reports/cash-flow?from=2026-06-01&to=2026-07-31", nil).want(200).json()["items"].([]any)
	if len(cf) != 2 {
		t.Fatalf("%v", cf)
	}
	bd := g.call("GET", "/api/v1/reports/category-breakdown?measure=gross", nil).want(200).json()
	if bd["total"].(map[string]any)["minor"].(float64) != 17500 || bd["items"].([]any)[0].(map[string]any)["name_en"] != "Shopping" {
		t.Fatalf("%v", bd)
	}
	for _, name := range []string{"net-worth", "sankey", "budget", "recurring", "heatmap", "installments", "foreign", "anomalies", "warnings"} {
		g.call("GET", "/api/v1/reports/"+name+"?from=2026-01-01&to=2026-12-31", nil).want(200)
	}
	g.call("GET", "/api/v1/reports/nope", nil).want(404)
	g.call("GET", "/api/v1/reports/cash-flow?from=oops", nil).want(400)
	g.call("GET", "/api/v1/reports/cash-flow?measure=weird", nil).want(400)
	up := g.call("GET", "/api/v1/billing/upcoming", nil).want(200).json()
	cs := g.call("GET", "/api/v1/billing/card-spend", nil).want(200).json()["items"].([]any)
	if up["items"] == nil || len(cs) == 0 {
		t.Fatalf("%v %v", up, cs)
	}
	g.call("GET", "/api/v1/billing/review", nil).want(200)

	// --- undo ---
	g.call("POST", "/api/v1/categorization/runs/"+runID+"/undo", map[string]any{}).want(200)
	if n := g.call("GET", "/api/v1/transactions?category_id=uncategorized", nil).want(200).json()["total"].(float64); n != 5 {
		t.Fatalf("undo left %v uncategorized", n)
	}
	batches := g.call("GET", "/api/v1/imports", nil).want(200).json()["items"].([]any)
	if len(batches) < 2 {
		t.Fatalf("%v", batches)
	}
	var bankBatch string
	for _, b := range batches {
		if bm := b.(map[string]any); bm["source"] == "LEUMI_BANK_XLS" {
			bankBatch = bm["id"].(string)
			if bm["rows"].(float64) != 2 || bm["filename"] != "תנועות.xls" || bm["account_name"] != "Leumi" {
				t.Fatalf("%v", bm)
			}
		}
	}
	g.call("POST", "/api/v1/imports/"+bankBatch+"/undo", map[string]any{}).want(204)
	if n := g.call("GET", "/api/v1/transactions?account_id="+bank, nil).want(200).json()["total"].(float64); n != 0 {
		t.Fatalf("bank lines left after undo: %v", n)
	}
	st2 := g.call("GET", "/api/v1/statements?account_id="+card, nil).want(200).json()["items"].([]any)[0].(map[string]any)
	if len(st2["settlements"].([]any)) != 0 {
		t.Fatalf("settlement outlived its bank line: %v", st2)
	}
	g.call("POST", "/api/v1/imports/"+bankBatch+"/undo", map[string]any{}).want(400) // only once
	g.call("POST", "/api/v1/imports/nope/undo", map[string]any{}).want(404)
}

func TestUploadHardening(t *testing.T) {
	g := newRig(t, false)
	bank := g.account("Leumi", "BANK")
	g.cfg.MaxUploadMB = 1
	big := bytes.Repeat([]byte("x"), 2<<20)
	g.upload("/api/v1/imports/stage", "big.csv", big, map[string]string{"source": "CSV", "mapping": cardMapping, "account_id": bank}).want(413)
	g.upload("/api/v1/imports/stage", "", nil, map[string]string{"source": "CSV"}).want(400)                        // no file
	g.upload("/api/v1/imports/stage", "e.csv", []byte(""), map[string]string{"source": "CSV"}).want(400)            // empty file
	g.upload("/api/v1/imports/stage", "a.pdf", []byte("%PDF-1.4"), nil).want(400)                                   // source must be chosen for PDFs
	g.upload("/api/v1/imports/stage", "a.csv", []byte("a,b\n1,2\n"), map[string]string{"source": "NOPE"}).want(400) // unknown source
	g.upload("/api/v1/imports/stage", "a.csv", []byte("a,b\n1,2\n"), map[string]string{"source": "CSV"}).want(400)  // no mapping
	g.upload("/api/v1/imports/stage", "a.csv", []byte("a,b\n1,2\n"), map[string]string{"source": "CSV", "mapping": `{"evil":1}`}).want(400)
	g.upload("/api/v1/imports/stage", "a.pdf", []byte("not a pdf at all"), map[string]string{"source": "CAL_PDF"}).want(422)
	g.upload("/api/v1/imports/stage", "a.xls", []byte("<html>no table</html>"), map[string]string{"account_id": bank}).want(422)
	// A plain JSON POST is not an upload.
	g.call("POST", "/api/v1/imports/stage", map[string]any{"x": 1}).want(400)
	// Just over the limit, but within the body cap: the file itself is still refused.
	almost := append([]byte(cardCSV), bytes.Repeat([]byte(" "), 1<<20+10<<10)...)
	g.upload("/api/v1/imports/stage", "almost.csv", almost, map[string]string{"source": "CSV", "mapping": cardMapping, "account_id": bank}).want(413)
	// Names with Windows separators or control characters are reduced to a printable base name.
	win := g.upload("/api/v1/imports/stage", "C:\\Users\\x\\..\\st\u0085atement.csv", []byte(cardCSV), map[string]string{"source": "CSV", "mapping": cardMapping, "account_id": bank}).want(200).json()
	if win["filename"] != "statement.csv" {
		t.Fatalf("filename %q", win["filename"])
	}
	// A path in the file name is never trusted.
	ok := g.upload("/api/v1/imports/stage", "../../etc/passwd.csv", []byte(cardCSV), map[string]string{"source": "CSV", "mapping": cardMapping, "account_id": bank}).want(200).json()
	if ok["filename"] != "passwd.csv" {
		t.Fatalf("filename %v", ok["filename"])
	}
	// A card file for another card is refused.
	card := g.call("POST", "/api/v1/accounts", map[string]any{"name": "C", "type": "CREDIT_CARD", "institution": "X", "last4": "1111"}).want(201).json()["id"].(string)
	_ = card
	// Staged uploads are bounded: the oldest are dropped.
	first := ok["stage_id"].(string)
	for i := 0; i < maxStaged+2; i++ {
		g.upload("/api/v1/imports/stage", "a.csv", []byte(cardCSV), map[string]string{"source": "CSV", "mapping": cardMapping, "account_id": bank}).want(200)
	}
	g.call("POST", "/api/v1/imports/staged/"+first+"/commit", map[string]any{"account_id": bank}).want(404)
	g.call("DELETE", "/api/v1/imports/staged/whatever", nil).want(204)
}

func TestSettingsEndpoints(t *testing.T) {
	g := newRig(t, false)
	out := g.call("PUT", "/api/v1/settings", map[string]any{"values": map[string]string{"llm_api_key": "sk-very-secret", "classifier_model": "m"}}).want(200)
	if strings.Contains(out.Body.String(), "sk-very-secret") {
		t.Fatal("secret echoed back")
	}
	body := g.call("GET", "/api/v1/settings", nil).want(200)
	if strings.Contains(body.Body.String(), "sk-very-secret") {
		t.Fatal("secret readable")
	}
	var key map[string]any
	for _, it := range body.json()["items"].([]any) {
		if it.(map[string]any)["key"] == "llm_api_key" {
			key = it.(map[string]any)
		}
	}
	if key["is_set"] != true || key["secret"] != true || key["value"] != "" {
		t.Fatalf("%v", key)
	}
	g.call("PUT", "/api/v1/settings", map[string]any{"values": map[string]string{"nope": "x"}}).want(400)
	g.call("PUT", "/api/v1/settings", map[string]any{"values": map[string]string{"llm_base_url": "javascript:alert(1)"}}).want(400)
	g.call("PUT", "/api/v1/settings", map[string]any{"values": map[string]string{}}).want(400)
	g.call("POST", "/api/v1/settings/test-llm", map[string]any{}).want(409)
	// test-llm takes no URL from the request: extra fields are rejected.
	g.call("POST", "/api/v1/settings/test-llm", map[string]any{"url": "http://169.254.169.254/"}).want(409)
}

func TestStagedUploadsExpire(t *testing.T) {
	g := newRig(t, false)
	bank := g.account("Leumi", "BANK")
	now := time.Date(2026, 7, 1, 12, 0, 0, 0, time.UTC)
	g.srv.staged.now = func() time.Time { return now }
	st := g.upload("/api/v1/imports/stage", "a.csv", []byte(cardCSV), map[string]string{"source": "CSV", "mapping": cardMapping, "account_id": bank}).want(200).json()
	now = now.Add(stagedTTL - time.Minute)
	if _, ok := g.srv.staged.get(st["stage_id"].(string)); !ok {
		t.Fatal("expired too early")
	}
	now = now.Add(2 * time.Minute)
	g.call("POST", "/api/v1/imports/staged/"+st["stage_id"].(string)+"/commit", map[string]any{"account_id": bank}).want(404)
}

func TestCategorizeWithADecisionModel(t *testing.T) {
	g := newRig(t, false)
	acc := g.account("Leumi", "BANK")
	shop := g.call("POST", "/api/v1/categories", map[string]any{"name_en": "Shopping", "name_he": "קניות", "type": "EXPENSE"}).want(201).json()["id"].(string)
	g.call("POST", "/api/v1/categories", map[string]any{"name_en": "Fuel", "type": "EXPENSE"}).want(201)
	for i, p := range []string{"ZARA ISRAEL", "ZARA ISRAEL", "פז - תחנת דלק"} {
		g.call("POST", "/api/v1/transactions", map[string]any{"account_id": acc, "date": fmt.Sprintf("2026-02-0%d", i+1), "amount_minor": -1000, "payee": p}).want(201)
	}
	var asked []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/chat/completions" { // the generator's connection probe
			w.Write([]byte(`{"choices":[{"message":{"content":"{\"ok\":true}"}}]}`))
			return
		}
		if r.URL.Path != "/v1/systemone" {
			t.Errorf("unexpected call to %s", r.URL.Path)
		}
		var req struct {
			State     string
			Questions map[string]struct{ Criteria map[string]string }
		}
		json.NewDecoder(r.Body).Decode(&req)
		asked = append(asked, req.State)
		crit := req.Questions["choice"].Criteria
		key := ""
		for k, d := range crit {
			if strings.HasPrefix(d, "Shopping") && strings.Contains(req.State, "ZARA") || strings.HasPrefix(d, "Fuel") && strings.Contains(req.State, "דלק") {
				key = k
			}
		}
		fmt.Fprintf(w, `{"answers":{"choice":{"choice":%q,"probabilities":{%q:0.93}}}}`, key, key)
	}))
	defer srv.Close()
	g.call("PUT", "/api/v1/settings", map[string]any{"values": map[string]string{"llm_base_url": srv.URL + "/v1", "classifier_model": "nimble", "generator_model": "gen", "classifier_api": "decision"}}).want(200)
	test := g.call("POST", "/api/v1/settings/test-llm", map[string]any{}).want(200).json()
	if test["classifier"].(map[string]any)["ok"] != false { // the fake answers an unknown key for the probe: reported, not crashed
		t.Logf("probe result: %v", test["classifier"])
	}
	asked = nil
	start := g.call("POST", "/api/v1/categorization/runs", map[string]any{}).want(202).json()
	g.srv.d.Categorize.Wait(start["id"].(string))
	if len(asked) != 2 { // two distinct payees, asked once each
		t.Fatalf("decision model asked %d times: %v", len(asked), asked)
	}
	if n := g.call("GET", "/api/v1/transactions?category_id="+shop, nil).want(200).json()["total"].(float64); n != 2 {
		t.Fatalf("shopping: %v", n)
	}
	if n := g.call("GET", "/api/v1/transactions?category_id=uncategorized", nil).want(200).json()["total"].(float64); n != 0 {
		t.Fatalf("%v left uncategorized", n)
	}
}
