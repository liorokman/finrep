-- The single definition of what counts as spending and income (spec section 3). Every report reads
-- this view; none of them re-implements the rules.
--
--   flow     SPEND | INCOME | EXCLUDED
--   gross_value / oop_value   the line's magnitude in its flow's direction (a spend is positive),
--                             gross = as bought, oop = after employer coverage (out of pocket)
--
-- Excluded: employer-coverage lines (they only reduce the covered purchase's out-of-pocket value),
-- TRANSFER categories, and bank debits that settle a card statement or pay an untracked card.
-- A category's type decides the flow (so a refund in an EXPENSE category nets against spending);
-- an uncategorized line is spending when negative and income when positive.
CREATE VIEW ledger_view AS
SELECT x.*,
    CASE x.flow WHEN 'SPEND' THEN -x.amount_minor WHEN 'INCOME' THEN x.amount_minor ELSE 0 END AS gross_value,
    CASE x.flow WHEN 'SPEND' THEN -(x.amount_minor + x.covered_minor) WHEN 'INCOME' THEN x.amount_minor ELSE 0 END AS oop_value
FROM (
    SELECT
        t.id                 AS id,
        t.account_id         AS account_id,
        a.name               AS account_name,
        a.account_type       AS account_type,
        a.owner              AS owner,
        a.currency           AS currency,
        t.date               AS date,
        COALESCE(t.bill_date, t.date) AS cash_date,
        t.amount_minor       AS amount_minor,
        t.kind               AS kind,
        t.scope              AS scope,
        COALESCE(NULLIF(t.payee_cleaned, ''), t.payee_raw) AS payee,
        t.category_id        AS category_id,
        c.category_type      AS category_type,
        t.current_installment AS current_installment,
        t.total_installments AS total_installments,
        t.original_amount_minor AS original_amount_minor,
        t.original_currency  AS original_currency,
        COALESCE(cov.covered, 0) AS covered_minor,
        CASE
            WHEN t.kind = 'EMPLOYER_COVERAGE' THEN 'EXCLUDED'
            WHEN c.category_type = 'TRANSFER' THEN 'EXCLUDED'
            WHEN a.account_type = 'BANK' AND (
                    EXISTS (SELECT 1 FROM settlements s WHERE s.bank_transaction_id = t.id)
                 OR EXISTS (SELECT 1 FROM external_payments e WHERE e.bank_transaction_id = t.id)) THEN 'EXCLUDED'
            WHEN c.category_type = 'EXPENSE' THEN 'SPEND'
            WHEN c.category_type = 'INCOME' THEN 'INCOME'
            WHEN t.amount_minor < 0 THEN 'SPEND'
            ELSE 'INCOME'
        END AS flow
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN (SELECT covers_transaction_id AS id, SUM(amount_minor) AS covered
               FROM transactions WHERE kind = 'EMPLOYER_COVERAGE' AND covers_transaction_id IS NOT NULL
               GROUP BY covers_transaction_id) cov ON cov.id = t.id
) x;
