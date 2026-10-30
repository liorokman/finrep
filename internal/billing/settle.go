package billing

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/store"
)

type Source string

const (
	Auto   Source = "AUTO"
	Manual Source = "MANUAL"
)

// Settle records that a bank debit paid (part of) a statement. A nil amount means "as much of the
// debit as the statement still needs". The statement's charges take the debit's date as their bill
// date (spec 6.2, rule 1). The pair's earlier rejection, if any, is forgotten.
func (s *Service) Settle(ctx context.Context, statementID, bankTxID string, amount *money.Money, src Source) (string, error) {
	var id string
	err := s.st.WithTx(ctx, func(tx *sql.Tx) error {
		var accType, stmtCur string
		var expected int64
		err := tx.QueryRowContext(ctx, `SELECT a.account_type, a.currency, COALESCE((SELECT SUM(-amount_minor) FROM transactions WHERE statement_id = s.id), 0)
			FROM statements s JOIN accounts a ON a.id = s.account_id WHERE s.id = ?`, statementID).Scan(&accType, &stmtCur, &expected)
		if errors.Is(err, sql.ErrNoRows) {
			return ledger.ErrNotFound
		} else if err != nil {
			return err
		}
		var bankType, bankCur, bankDate string
		var bankAmt int64
		err = tx.QueryRowContext(ctx, `SELECT a.account_type, t.currency, t.date, t.amount_minor FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE t.id = ?`, bankTxID).
			Scan(&bankType, &bankCur, &bankDate, &bankAmt)
		if errors.Is(err, sql.ErrNoRows) {
			return ledger.ErrNotFound
		} else if err != nil {
			return err
		}
		if bankType != string(ledger.Bank) || bankAmt >= 0 {
			return invalid("a settlement needs a debit from a bank account")
		}
		if bankCur != stmtCur {
			return invalid("debit is in %s but the statement is in %s", bankCur, stmtCur)
		}
		var external int
		if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM external_payments WHERE bank_transaction_id = ?`, bankTxID).Scan(&external); err != nil {
			return err
		}
		if external > 0 {
			return invalid("this debit is marked as paying an untracked card")
		}
		var allocated, already int64
		if err := tx.QueryRowContext(ctx, `SELECT COALESCE(SUM(amount_minor), 0) FROM settlements WHERE bank_transaction_id = ?`, bankTxID).Scan(&allocated); err != nil {
			return err
		}
		if err := tx.QueryRowContext(ctx, `SELECT COALESCE(SUM(amount_minor), 0) FROM settlements WHERE statement_id = ?`, statementID).Scan(&already); err != nil {
			return err
		}
		avail := -bankAmt - allocated
		var amt int64
		if amount == nil {
			amt = min(avail, max(expected-already, 0))
		} else {
			if amount.Currency() != money.Currency(stmtCur) {
				return invalid("amount currency %s does not match %s", amount.Currency(), stmtCur)
			}
			amt = amount.Minor()
		}
		if amt <= 0 {
			return invalid("nothing to settle: the debit has %d unallocated and the statement %d unpaid", avail, max(expected-already, 0))
		}
		if amt > avail {
			return invalid("amount exceeds the part of the debit not yet allocated")
		}
		id = store.NewID()
		if _, err := tx.ExecContext(ctx, `INSERT INTO settlements (id, statement_id, bank_transaction_id, amount_minor, source) VALUES (?, ?, ?, ?, ?)`,
			id, statementID, bankTxID, amt, src); err != nil {
			if strings.Contains(err.Error(), "UNIQUE constraint failed") {
				return ledger.ErrDuplicate
			}
			return err
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM settlement_rejections WHERE statement_id = ? AND bank_transaction_id = ?`, statementID, bankTxID); err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `UPDATE transactions SET bill_date = ?, bill_date_source = 'BANK', updated_at = CURRENT_TIMESTAMP WHERE statement_id = ?`, bankDate, statementID)
		return err
	})
	return id, err
}

// Unsettle removes a settlement and remembers the pair so auto-match never proposes it again. When
// the statement has no settlement left its charges go back to the statement's own bill date.
func (s *Service) Unsettle(ctx context.Context, settlementID string) error {
	return s.st.WithTx(ctx, func(tx *sql.Tx) error {
		var stmtID, bankID string
		err := tx.QueryRowContext(ctx, `SELECT statement_id, bank_transaction_id FROM settlements WHERE id = ?`, settlementID).Scan(&stmtID, &bankID)
		if errors.Is(err, sql.ErrNoRows) {
			return ledger.ErrNotFound
		} else if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM settlements WHERE id = ?`, settlementID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `INSERT OR IGNORE INTO settlement_rejections (statement_id, bank_transaction_id) VALUES (?, ?)`, stmtID, bankID); err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `UPDATE transactions SET
				bill_date = (SELECT bill_date FROM statements WHERE id = transactions.statement_id), bill_date_source = 'PDF', updated_at = CURRENT_TIMESTAMP
			WHERE statement_id = ? AND NOT EXISTS (SELECT 1 FROM settlements WHERE statement_id = ?)`, stmtID, stmtID)
		return err
	})
}

// MarkExternal flags a bank debit as paying a card that is not tracked here, which keeps it out of
// spending. A debit that already settles a statement cannot be marked.
func (s *Service) MarkExternal(ctx context.Context, bankTxID, note string) error {
	return s.st.WithTx(ctx, func(tx *sql.Tx) error {
		var typ string
		var amt int64
		err := tx.QueryRowContext(ctx, `SELECT a.account_type, t.amount_minor FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE t.id = ?`, bankTxID).Scan(&typ, &amt)
		if errors.Is(err, sql.ErrNoRows) {
			return ledger.ErrNotFound
		} else if err != nil {
			return err
		}
		if typ != string(ledger.Bank) || amt >= 0 {
			return invalid("only a bank debit can be marked as an external card payment")
		}
		var n int
		if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM settlements WHERE bank_transaction_id = ?`, bankTxID).Scan(&n); err != nil {
			return err
		}
		if n > 0 {
			return ledger.ErrInUse
		}
		_, err = tx.ExecContext(ctx, `INSERT INTO external_payments (bank_transaction_id, note) VALUES (?, NULLIF(?, ''))
			ON CONFLICT (bank_transaction_id) DO UPDATE SET note = excluded.note`, bankTxID, note)
		return err
	})
}

// UnmarkExternal reverses MarkExternal.
func (s *Service) UnmarkExternal(ctx context.Context, bankTxID string) error {
	res, err := s.st.ExecContext(ctx, `DELETE FROM external_payments WHERE bank_transaction_id = ?`, bankTxID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ledger.ErrNotFound
	}
	return nil
}
