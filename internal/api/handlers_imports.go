package api

import (
	"bytes"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"path"
	"strings"
	"unicode"

	"github.com/liorokman/finrep/internal/importer"
	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
)

// upload is a parsed multipart request: one file plus a few text fields.
type upload struct {
	data     []byte
	filename string
	fields   map[string]string
}

// readUpload enforces the upload cap and returns the "file" part and the other fields.
func (s *Server) readUpload(w http.ResponseWriter, r *http.Request) (*upload, error) {
	limit := int64(s.d.Config.MaxUploadMB) << 20
	r.Body = http.MaxBytesReader(w, r.Body, limit+(1<<20))
	if err := r.ParseMultipartForm(4 << 20); err != nil {
		var mbe *http.MaxBytesError
		if errors.As(err, &mbe) {
			return nil, &apiError{http.StatusRequestEntityTooLarge, "the file is larger than the upload limit"}
		}
		return nil, bad("expected a multipart form upload")
	}
	defer r.MultipartForm.RemoveAll()
	u := &upload{fields: map[string]string{}}
	for k, v := range r.MultipartForm.Value {
		if len(v) > 0 && len(v[0]) <= 64<<10 {
			u.fields[k] = v[0]
		}
	}
	files := r.MultipartForm.File["file"]
	if len(files) != 1 {
		return nil, bad("upload exactly one file in the \"file\" field")
	}
	f, err := files[0].Open()
	if err != nil {
		return nil, bad("could not read the uploaded file")
	}
	defer f.Close()
	data, err := readLimited(f, limit)
	if err != nil {
		return nil, err
	}
	if len(data) == 0 {
		return nil, bad("the uploaded file is empty")
	}
	u.data, u.filename = data, cleanFilename(files[0].Filename)
	return u, nil
}

func readLimited(f multipart.File, limit int64) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(f, limit+1))
	if err != nil {
		return nil, bad("could not read the uploaded file")
	}
	if int64(len(data)) > limit {
		return nil, &apiError{http.StatusRequestEntityTooLarge, "the file is larger than the upload limit"}
	}
	return data, nil
}

// cleanFilename keeps only a printable base name; it is stored and shown, never used as a path.
func cleanFilename(name string) string {
	name = path.Base(strings.ReplaceAll(name, "\\", "/"))
	name = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, name)
	if name == "" || name == "." || name == "/" {
		return "upload"
	}
	if len(name) > 200 {
		name = name[:200]
	}
	return name
}

type csvMappingReq struct {
	HasHeader              bool     `json:"has_header"`
	Delimiter              string   `json:"delimiter"`
	DateColumn             string   `json:"date_column"`
	DateFormat             string   `json:"date_format"`
	PayeeColumns           []string `json:"payee_columns"`
	NotesColumn            string   `json:"notes_column"`
	AmountColumn           string   `json:"amount_column"`
	DebitColumn            string   `json:"debit_column"`
	CreditColumn           string   `json:"credit_column"`
	InvertSign             bool     `json:"invert_sign"`
	OriginalAmountColumn   string   `json:"original_amount_column"`
	OriginalCurrencyColumn string   `json:"original_currency_column"`
	BillDateColumn         string   `json:"bill_date_column"`
	CurrentInstallmentCol  string   `json:"current_installment_column"`
	TotalInstallmentsCol   string   `json:"total_installments_column"`
	Currency               string   `json:"currency"`
}

func (m csvMappingReq) mapping() (importer.CSVMapping, error) {
	out := importer.CSVMapping{HasHeader: m.HasHeader, DateColumn: m.DateColumn, DateFormat: m.DateFormat, PayeeColumns: m.PayeeColumns,
		NotesColumn: m.NotesColumn, AmountColumn: m.AmountColumn, DebitColumn: m.DebitColumn, CreditColumn: m.CreditColumn,
		InvertSign: m.InvertSign, OriginalAmountColumn: m.OriginalAmountColumn, OriginalCurrencyColumn: m.OriginalCurrencyColumn,
		BillDateColumn: m.BillDateColumn, CurrentInstallmentCol: m.CurrentInstallmentCol, TotalInstallmentsCol: m.TotalInstallmentsCol,
		Currency: money.Currency(m.Currency)}
	switch r := []rune(m.Delimiter); len(r) {
	case 0:
	case 1:
		out.Delimiter = r[0]
	default:
		return out, bad("delimiter must be a single character")
	}
	return out, nil
}

func (s *Server) inspectCSV(w http.ResponseWriter, r *http.Request) {
	u, err := s.readUpload(w, r)
	if err != nil {
		fail(w, r, err)
		return
	}
	in, err := importer.InspectCSV(u.data)
	if err != nil {
		fail(w, r, &apiError{http.StatusUnprocessableEntity, "could not read the CSV: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"delimiter": string(in.Delimiter), "columns": list(in.Columns), "sample": list(in.Sample),
		"rows": in.Rows, "date_formats": importer.DateFormats()})
}

// parseUpload turns an upload into a Parsed according to its source.
func parseUpload(u *upload) (*importer.Parsed, error) {
	src := importer.Source(strings.ToUpper(u.fields["source"]))
	if src == "" {
		switch strings.ToLower(path.Ext(u.filename)) {
		case ".xls", ".xlsx", ".html", ".htm":
			src = importer.SourceLeumiBank
		case ".csv", ".txt":
			src = importer.SourceCSV
		default:
			return nil, bad("choose the source of this file")
		}
	}
	var p *importer.Parsed
	var err error
	switch src {
	case importer.SourceLeumiBank:
		p, err = importer.ParseLeumiBank(bytes.NewReader(u.data), u.filename)
	case importer.SourceCalPDF:
		p, err = importer.ParseCal(u.data, u.filename, importer.PDFOptions{})
	case importer.SourceIsracard:
		p, err = importer.ParseIsracard(u.data, u.filename, importer.PDFOptions{})
	case importer.SourceLeumiCard:
		p, err = importer.ParseLeumiCard(u.data, u.filename, importer.PDFOptions{})
	case importer.SourceCSV:
		var req csvMappingReq
		if raw := u.fields["mapping"]; raw == "" {
			return nil, bad("a CSV import needs a column mapping")
		} else if err := decodeStrict(raw, &req); err != nil {
			return nil, bad("invalid mapping: %v", err)
		}
		m, merr := req.mapping()
		if merr != nil {
			return nil, merr
		}
		p, err = importer.ParseCSV(u.data, u.filename, m)
	default:
		return nil, bad("unknown source %q", u.fields["source"])
	}
	if err != nil {
		return nil, &apiError{http.StatusUnprocessableEntity, "could not read the file: " + cleanMsg(err)}
	}
	return p, nil
}

type previewView struct {
	New        int                  `json:"new"`
	Duplicates int                  `json:"duplicates"`
	Skipped    []importer.Skipped   `json:"skipped"`
	Rejected   []importer.Rejected  `json:"rejected"`
	Statements []importer.Statement `json:"statements"`
	Warnings   []string             `json:"warnings"`
}

// stageImport parses an upload and keeps the result for a later commit. When the target account is
// known (given, or found from the card's last four digits) it also previews what would change.
func (s *Server) stageImport(w http.ResponseWriter, r *http.Request) {
	u, err := s.readUpload(w, r)
	if err != nil {
		fail(w, r, err)
		return
	}
	p, err := parseUpload(u)
	if err != nil {
		fail(w, r, err)
		return
	}
	out := map[string]any{"source": p.Source, "filename": p.Filename, "last4": p.Last4, "line_count": len(p.Lines),
		"statements": list(p.Statements), "warnings": list(p.Warnings), "rejected": list(p.Rejected),
		"sample_lines": list(p.Lines[:min(len(p.Lines), 10)])}
	accID := u.fields["account_id"]
	if accID == "" && p.Last4 != "" {
		acc, rerr := s.d.Importer.ResolveCard(r.Context(), p.Last4)
		if rerr != nil {
			out["account_error"] = cleanMsg(rerr)
		} else {
			accID = acc.ID
		}
	}
	if accID != "" {
		pv, perr := s.d.Importer.Preview(r.Context(), accID, p)
		if perr != nil {
			fail(w, r, &apiError{http.StatusUnprocessableEntity, cleanMsg(perr)})
			return
		}
		out["account_id"] = accID
		out["preview"] = previewView{New: pv.New, Duplicates: pv.Duplicates, Skipped: list(pv.Skipped), Rejected: list(pv.Rejected),
			Statements: list(pv.Statements), Warnings: list(pv.Warnings)}
	}
	out["stage_id"] = s.staged.put(p, p.Filename)
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) commitImport(w http.ResponseWriter, r *http.Request) {
	var in struct {
		AccountID string `json:"account_id"`
	}
	if err := readJSON(w, r, &in); err != nil {
		fail(w, r, err)
		return
	}
	id := r.PathValue("id")
	st, ok := s.staged.get(id)
	if !ok {
		fail(w, r, &apiError{http.StatusNotFound, "this upload has expired; upload the file again"})
		return
	}
	accID := in.AccountID
	if accID == "" {
		acc, err := s.d.Importer.ResolveCard(r.Context(), st.parsed.Last4)
		if err != nil {
			fail(w, r, &apiError{http.StatusBadRequest, cleanMsg(err)})
			return
		}
		accID = acc.ID
	}
	res, err := s.d.Importer.Commit(r.Context(), accID, st.parsed)
	if err != nil {
		var ae *apiError
		if !errors.As(err, &ae) && errors.Is(err, ledger.ErrNotFound) {
			err = bad("%s", cleanMsg(err))
		}
		if errors.As(err, new(*importer.TotalMismatchError)) {
			err = &apiError{http.StatusUnprocessableEntity, err.Error()}
		}
		fail(w, r, err)
		return
	}
	s.staged.drop(id)
	assigned, err := s.d.Billing.AssignBillDates(r.Context(), accID)
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"batch_id": res.BatchID, "account_id": accID, "inserted": res.Inserted, "duplicates": res.Duplicates,
		"skipped": list(res.Skipped), "rejected": list(res.Rejected), "warnings": list(res.Warnings), "bill_dates_assigned": assigned})
}

func (s *Server) discardStaged(w http.ResponseWriter, r *http.Request) {
	s.staged.drop(r.PathValue("id"))
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) listBatches(w http.ResponseWriter, r *http.Request) {
	bs, err := s.d.Importer.ListBatches(r.Context(), 200)
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": list(bs)})
}

func (s *Server) undoBatch(w http.ResponseWriter, r *http.Request) {
	if err := s.d.Importer.Undo(r.Context(), r.PathValue("id")); err != nil {
		fail(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
