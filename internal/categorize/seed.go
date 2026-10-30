package categorize

import (
	"context"
	"errors"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/store"
)

type seedCat struct {
	en, he string
	typ    ledger.CategoryType
}

// seedCategories is the starter set. It is deliberately coarse: the generator model adds
// finer categories when a transaction fits none of these.
var seedCategories = []seedCat{
	{"Groceries", "סופרמרקט ומכולת", ledger.Expense},
	{"Restaurants", "מסעדות", ledger.Expense},
	{"Coffee & Cafes", "קפה ובתי קפה", ledger.Expense},
	{"Fuel", "דלק", ledger.Expense},
	{"Public Transport", "תחבורה ציבורית", ledger.Expense},
	{"Taxi & Rideshare", "מוניות ונסיעות שיתופיות", ledger.Expense},
	{"Parking & Tolls", "חניה וכבישי אגרה", ledger.Expense},
	{"Car", "רכב", ledger.Expense},
	{"Rent & Mortgage", "שכר דירה ומשכנתא", ledger.Expense},
	{"Municipal Tax", "ארנונה", ledger.Expense},
	{"Electricity & Water", "חשמל ומים", ledger.Expense},
	{"Home & Garden", "בית וגן", ledger.Expense},
	{"Telecom & Internet", "תקשורת ואינטרנט", ledger.Expense},
	{"Subscriptions", "מנויים", ledger.Expense},
	{"Health", "בריאות", ledger.Expense},
	{"Pharmacy", "בית מרקחת", ledger.Expense},
	{"Insurance", "ביטוח", ledger.Expense},
	{"Education", "חינוך והשכלה", ledger.Expense},
	{"Kids", "ילדים", ledger.Expense},
	{"Clothing & Shoes", "ביגוד והנעלה", ledger.Expense},
	{"Electronics", "אלקטרוניקה", ledger.Expense},
	{"Entertainment", "בילוי ופנאי", ledger.Expense},
	{"Travel & Vacation", "נסיעות וחופשות", ledger.Expense},
	{"Gifts & Donations", "מתנות ותרומות", ledger.Expense},
	{"Personal Care", "טיפוח", ledger.Expense},
	{"Pets", "חיות מחמד", ledger.Expense},
	{"Fees & Interest", "עמלות וריבית", ledger.Expense},
	{"Taxes", "מיסים", ledger.Expense},
	{"Cash Withdrawal", "משיכת מזומן", ledger.Expense},
	{"Shopping", "קניות כלליות", ledger.Expense},
	{"Miscellaneous", "שונות", ledger.Expense},
	// Bank debits that pay cards this app has no statements for; counted as spending in one lump.
	{"Wife's Cards", "כרטיסי אשראי של בת הזוג", ledger.Expense},
	{"Salary", "משכורת", ledger.Income},
	{"Refunds", "החזרים", ledger.Income},
	{"Investment Income", "הכנסות מהשקעות", ledger.Income},
	{"Other Income", "הכנסות אחרות", ledger.Income},
	{"Credit Card Payment", "חיוב כרטיס אשראי", ledger.Transfer},
	{"Account Transfer", "העברה בין חשבונות", ledger.Transfer},
	{"Savings & Investments", "חיסכון והשקעות", ledger.Transfer},
}

var palette = []string{"#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16", "#06B6D4", "#A855F7"}

const seededKey = "categories_seeded"

// Seed adds the starter categories that do not exist yet (matched by English name) and returns how many it created.
func Seed(ctx context.Context, l *ledger.Ledger) (int, error) {
	n := 0
	for i, s := range seedCategories {
		_, err := l.FindCategoryByName(ctx, s.en)
		if err == nil {
			continue
		}
		if !errors.Is(err, ledger.ErrNotFound) {
			return n, err
		}
		c := &ledger.Category{NameEN: s.en, NameHE: s.he, Type: s.typ, ColorHex: palette[i%len(palette)], CreatedBy: ledger.ByUser}
		if err := l.CreateCategory(ctx, c); err != nil && !errors.Is(err, ledger.ErrDuplicate) {
			return n, err
		}
		n++
	}
	return n, nil
}

// SeedOnce seeds on first start only, so categories the user deleted later do not come back.
func SeedOnce(ctx context.Context, st *store.Store, l *ledger.Ledger) (int, error) {
	var v string
	err := st.QueryRowContext(ctx, `SELECT value FROM settings WHERE key = ?`, seededKey).Scan(&v)
	if err == nil {
		return 0, nil
	}
	n, err := Seed(ctx, l)
	if err != nil {
		return n, err
	}
	_, err = st.ExecContext(ctx, `INSERT OR REPLACE INTO settings (key, value) VALUES (?, '1')`, seededKey)
	return n, err
}
