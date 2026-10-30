package importer

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/store"
)

// Importer commits parsed files into the ledger.
type Importer struct {
	st *store.Store
	l  *ledger.Ledger
}

// New returns an Importer.
func New(st *store.Store, l *ledger.Ledger) *Importer { return &Importer{st: st, l: l} }

// Preview describes what committing a file would do, without changing anything.
type Preview struct {
	New        int
	Duplicates int
	Skipped    []Skipped
	Rejected   []Rejected
	Statements []Statement
	Warnings   []string
}

// Result is the outcome of a commit.
type Result struct {
	BatchID    string
	Inserted   int
	Duplicates int
	Skipped    []Skipped
	Rejected   []Rejected
	Warnings   []string
}

// prepared holds the validated, key-assigned view of a file.
type prepared struct {
	keys    []string
	skipped []Skipped
}

func (im *Importer) prepare(ctx context.Context, accountID string, p *Parsed) (*prepared, error) {
	acc, err := im.l.GetAccount(ctx, accountID)
	if err != nil {
		return nil, fmt.Errorf("account: %w", err)
	}
	if p.Last4 != "" && acc.Last4 != "" && p.Last4 != acc.Last4 {
		return nil, fmt.Errorf("%w: the file is for card ending %s but the account ends %s", ledger.ErrInvalid, p.Last4, acc.Last4)
	}
	if err := Validate(p); err != nil {
		return nil, err
	}
	pr := &prepared{keys: keys(accountID, p.Lines)}
	for i, l := range p.Lines {
		if l.Date < ledger.EarliestDate {
			pr.skipped = append(pr.skipped, Skipped{Line: i + 1, Reason: "before " + ledger.EarliestDate})
		}
	}
	return pr, nil
}

// trailingNumber matches a stray number a statement can append to a merchant name (a column that spills over).
var trailingNumber = regexp.MustCompile(`\s+\d{1,2}$`)

func payeeCore(s string) string {
	return strings.TrimSpace(trailingNumber.ReplaceAllString(strings.TrimSpace(s), ""))
}

// nearDuplicate returns the id of a line already imported from another batch that is the same charge as l: the
// same card, date, amount, bill date and kind, with a merchant that differs only by a trailing number. A card
// lists a deferred charge once as information and again when it falls due, and the second listing can spell
// the merchant slightly differently, which a key alone would count as a new charge.
func nearDuplicate(ctx context.Context, q interface {
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
}, accountID string, l Line, key, batchID string) (string, error) {
	if l.BillDate == "" || l.Kind != ledger.KindPurchase {
		return "", nil
	}
	rows, err := q.QueryContext(ctx, `SELECT id, payee_raw FROM transactions
		WHERE account_id = ? AND date = ? AND amount_minor = ? AND bill_date = ? AND kind = ? AND import_key <> ?
		  AND COALESCE(batch_id, '') <> ? AND payee_raw <> ?`,
		accountID, l.Date, l.Amount.Minor(), l.BillDate, string(l.Kind), key, batchID, l.Payee)
	if err != nil {
		return "", err
	}
	defer rows.Close()
	for rows.Next() {
		var id, payee string
		if err := rows.Scan(&id, &payee); err != nil {
			return "", err
		}
		if payeeCore(payee) == payeeCore(l.Payee) {
			return id, nil
		}
	}
	return "", rows.Err()
}

func (pr *prepared) isSkipped(i int) bool {
	for _, s := range pr.skipped {
		if s.Line == i+1 {
			return true
		}
	}
	return false
}

// Preview reports how many lines are new, duplicates or skipped.
func (im *Importer) Preview(ctx context.Context, accountID string, p *Parsed) (*Preview, error) {
	pr, err := im.prepare(ctx, accountID, p)
	if err != nil {
		return nil, err
	}
	out := &Preview{Skipped: pr.skipped, Rejected: p.Rejected, Statements: p.Statements, Warnings: p.Warnings}
	for i := range p.Lines {
		if pr.isSkipped(i) {
			continue
		}
		var n int
		if err := im.st.QueryRowContext(ctx, `SELECT COUNT(*) FROM transactions WHERE import_key = ?`, pr.keys[i]).Scan(&n); err != nil {
			return nil, err
		}
		if n == 0 {
			if id, err := nearDuplicate(ctx, im.st, accountID, p.Lines[i], pr.keys[i], ""); err != nil {
				return nil, err
			} else if id != "" {
				n = 1
			}
		}
		if n > 0 {
			out.Duplicates++
		} else {
			out.New++
		}
	}
	return out, nil
}

// Commit imports the file as one batch, atomically. Lines whose key already
// exists are counted as duplicates and not inserted, so committing the same
// file twice changes nothing.
func (im *Importer) Commit(ctx context.Context, accountID string, p *Parsed) (*Result, error) {
	pr, err := im.prepare(ctx, accountID, p)
	if err != nil {
		return nil, err
	}
	res := &Result{BatchID: store.NewID(), Skipped: pr.skipped, Rejected: p.Rejected, Warnings: p.Warnings}
	err = im.st.WithTx(ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `INSERT INTO import_batches (id, source, filename, account_id) VALUES (?, ?, ?, ?)`,
			res.BatchID, p.Source, p.Filename, accountID); err != nil {
			return err
		}
		stmtIDs := map[string]string{}
		for _, s := range p.Statements {
			id, err := upsertStatement(ctx, tx, accountID, s.BillDate, s.PrintedTotal, p.Filename)
			if err != nil {
				return err
			}
			stmtIDs[s.BillDate] = id
		}
		ids := make([]string, len(p.Lines)) // transaction id per line, new or existing
		insert := func(i int) error {
			l := p.Lines[i]
			t := &ledger.Transaction{
				AccountID: accountID, BatchID: &res.BatchID, ImportKey: pr.keys[i], Date: l.Date,
				Amount: l.Amount, Original: l.Original, Scope: l.Scope, Kind: l.Kind, IsStandingOrder: l.IsStandingOrder,
				PayeeRaw: l.Payee,
			}
			if t.Scope == "" {
				t.Scope = ledger.TxLocal
			}
			if l.Notes != "" {
				t.Notes = &l.Notes
			}
			if l.CurrentInst > 0 {
				c, tot := l.CurrentInst, l.TotalInst
				t.CurrentInstallment, t.TotalInstallments = &c, &tot
			}
			if l.BillDate != "" {
				bd, src := l.BillDate, ledger.SourcePDF
				t.BillDate, t.BillDateSource = &bd, &src
				id, ok := stmtIDs[l.BillDate]
				if !ok {
					var err error
					if id, err = upsertStatement(ctx, tx, accountID, l.BillDate, nil, p.Filename); err != nil {
						return err
					}
					stmtIDs[l.BillDate] = id
				}
				t.StatementID = &id
			}
			if l.Covers != nil {
				if ids[*l.Covers] == "" {
					return fmt.Errorf("line %d covers line %d which was not imported", i+1, *l.Covers+1)
				}
				covered := ids[*l.Covers]
				t.CoversID = &covered
			}
			if id, err := nearDuplicate(ctx, tx, accountID, l, pr.keys[i], res.BatchID); err != nil {
				return err
			} else if id != "" {
				ids[i] = id
				res.Duplicates++
				return nil
			}
			err := im.l.InsertTransactionTx(ctx, tx, t)
			switch {
			case err == nil:
				ids[i] = t.ID
				res.Inserted++
			case errors.Is(err, ledger.ErrDuplicate):
				res.Duplicates++
				if err := tx.QueryRowContext(ctx, `SELECT id FROM transactions WHERE import_key = ?`, pr.keys[i]).Scan(&ids[i]); err != nil {
					return err
				}
			default:
				return fmt.Errorf("line %d (%s %s): %w", i+1, l.Date, l.Payee, err)
			}
			return nil
		}
		// Purchases before the coverage lines that reference them.
		for pass := 0; pass < 2; pass++ {
			for i, l := range p.Lines {
				if pr.isSkipped(i) || (pass == 0) != (l.Covers == nil) {
					continue
				}
				if err := insert(i); err != nil {
					return err
				}
			}
		}
		_, err := tx.ExecContext(ctx, `UPDATE import_batches SET row_count = ? WHERE id = ?`, res.Inserted, res.BatchID)
		return err
	})
	if err != nil {
		return nil, err
	}
	return res, nil
}

func upsertStatement(ctx context.Context, tx *sql.Tx, accountID, billDate string, total *money.Money, file string) (string, error) {
	var t *int64
	if total != nil {
		v := total.Minor()
		t = &v
	}
	var id string
	err := tx.QueryRowContext(ctx, `INSERT INTO statements (id, account_id, bill_date, printed_total_minor, source_file)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT (account_id, bill_date) DO UPDATE SET
			printed_total_minor = COALESCE(excluded.printed_total_minor, printed_total_minor),
			source_file = CASE WHEN excluded.printed_total_minor IS NULL THEN source_file ELSE excluded.source_file END
		RETURNING id`, store.NewID(), accountID, billDate, t, file).Scan(&id)
	return id, err
}

// Undo removes everything a batch imported. Statements that become empty and
// have no settlements are removed too. A batch can be undone once.
func (im *Importer) Undo(ctx context.Context, batchID string) error {
	return im.st.WithTx(ctx, func(tx *sql.Tx) error {
		var undone sql.NullString
		var accountID sql.NullString
		err := tx.QueryRowContext(ctx, `SELECT undone_at, account_id FROM import_batches WHERE id = ?`, batchID).Scan(&undone, &accountID)
		if errors.Is(err, sql.ErrNoRows) {
			return ledger.ErrNotFound
		} else if err != nil {
			return err
		}
		if undone.Valid {
			return fmt.Errorf("%w: batch was already undone", ledger.ErrInvalid)
		}
		// Coverage lines first so no reference dangles.
		for _, q := range []string{
			`DELETE FROM transactions WHERE batch_id = ? AND kind = 'EMPLOYER_COVERAGE'`,
			`DELETE FROM transactions WHERE batch_id = ?`,
		} {
			if _, err := tx.ExecContext(ctx, q, batchID); err != nil {
				return err
			}
		}
		if accountID.Valid {
			if _, err := tx.ExecContext(ctx, `DELETE FROM statements WHERE account_id = ?
				AND id NOT IN (SELECT statement_id FROM transactions WHERE statement_id IS NOT NULL)
				AND id NOT IN (SELECT statement_id FROM settlements)`, accountID.String); err != nil {
				return err
			}
		}
		_, err = tx.ExecContext(ctx, `UPDATE import_batches SET undone_at = CURRENT_TIMESTAMP WHERE id = ?`, batchID)
		return err
	})
}

// ResolveCard finds the card account for a file by its last four digits.
func (im *Importer) ResolveCard(ctx context.Context, last4 string) (*ledger.Account, error) {
	if last4 == "" {
		return nil, fmt.Errorf("%w: the file does not say which card it belongs to", ledger.ErrInvalid)
	}
	accs, err := im.l.ListAccounts(ctx)
	if err != nil {
		return nil, err
	}
	var match []ledger.Account
	for _, a := range accs {
		if a.Type == ledger.CreditCard && a.Last4 == last4 {
			match = append(match, a)
		}
	}
	switch len(match) {
	case 0:
		return nil, fmt.Errorf("%w: no card account ends with %s; create it first", ledger.ErrNotFound, last4)
	case 1:
		return &match[0], nil
	}
	names := make([]string, len(match))
	for i, a := range match {
		names[i] = a.Name
	}
	return nil, fmt.Errorf("%w: several cards end with %s (%s)", ledger.ErrInvalid, last4, strings.Join(names, ", "))
}

// Batch describes one committed import.
type Batch struct {
	ID          string
	Source      string
	Filename    string
	AccountID   string
	AccountName string
	Rows        int // transactions currently linked to the batch
	CreatedAt   string
	UndoneAt    string
}

// ListBatches returns the most recent imports first.
func (im *Importer) ListBatches(ctx context.Context, limit int) ([]Batch, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := im.st.QueryContext(ctx, `SELECT b.id, b.source, b.filename, COALESCE(b.account_id, ''), COALESCE(a.name, ''),
			(SELECT COUNT(*) FROM transactions t WHERE t.batch_id = b.id), b.created_at, COALESCE(b.undone_at, '')
		FROM import_batches b LEFT JOIN accounts a ON a.id = b.account_id
		ORDER BY b.created_at DESC, b.rowid DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Batch
	for rows.Next() {
		var b Batch
		if err := rows.Scan(&b.ID, &b.Source, &b.Filename, &b.AccountID, &b.AccountName, &b.Rows, &b.CreatedAt, &b.UndoneAt); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}
