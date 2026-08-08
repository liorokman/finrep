package database

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

// GenerateImportHash computes SHA-256(account_id | date | amount | payee_raw | daily_occurrence_ordinal)
func GenerateImportHash(accountID, dateStr string, amount float64, payeeRaw string, ordinal int) string {
	raw := fmt.Sprintf("%s|%s|%.2f|%s|%d", accountID, dateStr, amount, payeeRaw, ordinal)
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}
