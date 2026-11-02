package billing

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/store"
)

// ActivityKeyPrefix starts the import key of a synthetic "activity" line: a placeholder charge that stands
// for a card's whole bill when its statement cannot be imported. Its key is ActivityKeyPrefix + the id of the
// bank debit that paid the bill, so a debit has at most one.
const ActivityKeyPrefix = "activity:"

const activityPayee = "Card activity (statement not imported)"

// LinkActivity records that a bank debit paid a card's bill without a statement to show for it. It adds a
// synthetic activity charge for the debit's amount to the card, on a statement dated like the debit, and
// settles that statement with the debit. Reports then count the money as the card's spending instead of
// as an unexplained bank debit. Importing the real statement later replaces the placeholder (ReplaceActivity).
// It returns the id of the statement.
func (s *Service) LinkActivity(ctx context.Context, bankTxID, cardID string) (string, error) {
	var stmtID string
	err := s.st.WithTx(ctx, func(tx *sql.Tx) error {
		var bankType, cur, date, payee string
		var amt int64
		err := tx.QueryRowContext(ctx, `SELECT a.account_type, t.currency, t.date, t.amount_minor, t.payee_raw
			FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE t.id = ?`, bankTxID).Scan(&bankType, &cur, &date, &amt, &payee)
		if errors.Is(err, sql.ErrNoRows) {
			return ledger.ErrNotFound
		} else if err != nil {
			return err
		}
		if bankType != string(ledger.Bank) || amt >= 0 {
			return invalid("only a bank debit can be linked to a card")
		}
		var cardType, cardCur string
		err = tx.QueryRowContext(ctx, `SELECT account_type, currency FROM accounts WHERE id = ?`, cardID).Scan(&cardType, &cardCur)
		if errors.Is(err, sql.ErrNoRows) {
			return ledger.ErrNotFound
		} else if err != nil {
			return err
		}
		if cardType != string(ledger.CreditCard) {
			return invalid("the target must be a credit card")
		}
		if cardCur != cur {
			return invalid("debit is in %s but the card is in %s", cur, cardCur)
		}
		var n int
		if err := tx.QueryRowContext(ctx, `SELECT (SELECT COUNT(*) FROM settlements WHERE bank_transaction_id = ?1)
			+ (SELECT COUNT(*) FROM external_payments WHERE bank_transaction_id = ?1)`, bankTxID).Scan(&n); err != nil {
			return err
		}
		if n > 0 {
			return invalid("this debit is already linked to a bill or marked as paying an untracked card")
		}

		err = tx.QueryRowContext(ctx, `SELECT id FROM statements WHERE account_id = ? AND bill_date = ?`, cardID, date).Scan(&stmtID)
		switch {
		case err == nil:
			// Only a statement made of placeholders can take another one; a real one is settled directly.
			var real int
			if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM transactions WHERE statement_id = ? AND import_key NOT LIKE ?`,
				stmtID, ActivityKeyPrefix+"%").Scan(&real); err != nil {
				return err
			}
			if real > 0 {
				return invalid("the card already has a statement dated %s; settle that one with this debit instead", date)
			}
		case errors.Is(err, sql.ErrNoRows):
			stmtID = store.NewID()
			if _, err := tx.ExecContext(ctx, `INSERT INTO statements (id, account_id, bill_date) VALUES (?, ?, ?)`, stmtID, cardID, date); err != nil {
				return err
			}
		default:
			return err
		}

		if _, err := tx.ExecContext(ctx, `INSERT INTO transactions
			(id, account_id, import_key, date, amount_minor, currency, kind, scope, bill_date, bill_date_source, statement_id, payee_raw, notes)
			VALUES (?, ?, ?, ?, ?, ?, 'PURCHASE', 'LOCAL', ?, 'BANK', ?, ?, ?)`,
			store.NewID(), cardID, ActivityKeyPrefix+bankTxID, date, amt, cur, date, stmtID, activityPayee,
			"Placeholder for the bill paid by: "+payee+". Replaced when the card's statement is imported."); err != nil {
			return err
		}
		a := money.New(-amt, money.Currency(cur))
		_, err = settleTx(ctx, tx, stmtID, bankTxID, &a, Manual)
		return err
	})
	return stmtID, err
}

// dropActivity removes the placeholder that a settlement's bank debit created, and its statement when
// nothing else is left on it. It reports whether there was a placeholder.
func dropActivity(ctx context.Context, tx *sql.Tx, stmtID, bankTxID string) (bool, error) {
	res, err := tx.ExecContext(ctx, `DELETE FROM transactions WHERE statement_id = ? AND import_key = ?`, stmtID, ActivityKeyPrefix+bankTxID)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return false, nil
	}
	_, err = tx.ExecContext(ctx, `DELETE FROM statements WHERE id = ?1
		AND NOT EXISTS (SELECT 1 FROM transactions WHERE statement_id = ?1) AND NOT EXISTS (SELECT 1 FROM settlements WHERE statement_id = ?1)`, stmtID)
	return true, err
}

// ReplaceActivity swaps placeholders for the real thing once a card's statements have been imported: an
// activity line whose bank debit falls within MaxMatchDays of an imported statement's bill date is removed and
// the debit settles that statement instead. Among candidates, an amount that agrees wins over one that does
// not, then the closer date. A statement already paid by some other debit is left alone. It returns how many
// placeholders it replaced.
func (s *Service) ReplaceActivity(ctx context.Context, cardID string) (int, error) {
	replaced := 0
	err := s.st.WithTx(ctx, func(tx *sql.Tx) error {
		type act struct {
			stmtID, bankID, bankDate string
			amount                   int64 // positive
		}
		rows, err := tx.QueryContext(ctx, `SELECT t.statement_id, b.id, b.date, -b.amount_minor
			FROM transactions t JOIN settlements x ON x.statement_id = t.statement_id
			JOIN transactions b ON b.id = x.bank_transaction_id AND t.import_key = ? || b.id
			WHERE t.account_id = ? ORDER BY b.date, b.id`, ActivityKeyPrefix, cardID)
		if err != nil {
			return err
		}
		var acts []act
		for rows.Next() {
			var a act
			if err := rows.Scan(&a.stmtID, &a.bankID, &a.bankDate, &a.amount); err != nil {
				rows.Close()
				return err
			}
			acts = append(acts, a)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return err
		}
		if len(acts) == 0 {
			return nil
		}

		type stmt struct {
			id, billDate string
			expected     int64
		}
		srows, err := tx.QueryContext(ctx, `SELECT s.id, s.bill_date, SUM(-t.amount_minor)
			FROM statements s JOIN transactions t ON t.statement_id = s.id AND t.import_key NOT LIKE ?
			WHERE s.account_id = ? GROUP BY s.id`, ActivityKeyPrefix+"%", cardID)
		if err != nil {
			return err
		}
		var stmts []stmt
		for srows.Next() {
			var st stmt
			if err := srows.Scan(&st.id, &st.billDate, &st.expected); err != nil {
				srows.Close()
				return err
			}
			if st.expected > 0 {
				stmts = append(stmts, st)
			}
		}
		srows.Close()
		if err := srows.Err(); err != nil {
			return err
		}

		used := map[string]bool{}
		for _, a := range acts {
			bank, _ := time.Parse(dateLayout, a.bankDate)
			var best *stmt
			var bestExact bool
			var bestGap int
			var bestDiff int64
			for i := range stmts {
				st := &stmts[i]
				if used[st.id] {
					continue
				}
				var others int
				if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM settlements WHERE statement_id = ? AND bank_transaction_id <> ?`, st.id, a.bankID).Scan(&others); err != nil {
					return err
				}
				if others > 0 {
					continue
				}
				bill, _ := time.Parse(dateLayout, st.billDate)
				gap := int(bank.Sub(bill).Hours() / 24)
				if gap < 0 {
					gap = -gap
				}
				if gap > s.MaxMatchDays {
					continue
				}
				diff := a.amount - st.expected
				if diff < 0 {
					diff = -diff
				}
				exact := diff <= s.tolerance(st.expected)
				better := best == nil ||
					exact != bestExact && exact ||
					exact == bestExact && (gap < bestGap || gap == bestGap && diff < bestDiff)
				if better {
					best, bestExact, bestGap, bestDiff = st, exact, gap, diff
				}
			}
			if best == nil {
				continue
			}
			used[best.id] = true
			if _, err := tx.ExecContext(ctx, `DELETE FROM settlements WHERE statement_id = ? AND bank_transaction_id = ?`, a.stmtID, a.bankID); err != nil {
				return err
			}
			if _, err := dropActivity(ctx, tx, a.stmtID, a.bankID); err != nil {
				return err
			}
			if _, err := settleTx(ctx, tx, best.id, a.bankID, nil, Auto); err != nil {
				return err
			}
			replaced++
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return replaced, nil
}
