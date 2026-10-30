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
	{"Family Transfers", "העברות למשפחה", ledger.Expense},
	{"Sports & Hobbies", "ספורט וחוגים", ledger.Expense},
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
	// Bank debits where a card company bills the checking account. Those linked to a statement are not counted
	// (the card purchases are); those for a card with no imported statements are, in one lump.
	{"Credit cards", "כרטיסי אשראי", ledger.Expense},
	{"Salary", "משכורת", ledger.Income},
	{"Refunds", "החזרים", ledger.Income},
	{"Investment Income", "הכנסות מהשקעות", ledger.Income},
	{"Other Income", "הכנסות אחרות", ledger.Income},
	{"Account Transfer", "העברה בין חשבונות", ledger.Transfer},
	{"Savings & Investments", "חיסכון והשקעות", ledger.Transfer},
}

// seedDescriptions name typical Israeli merchants and the kinds of charge in each category. A decision
// model has no other way to know that Wolt is a restaurant delivery service or that Pango is parking.
var seedDescriptions = map[string]string{
	"Groceries":             "Supermarkets and grocery shops: Shufersal, Rami Levy, Yochananof, Mega, Victory, AM:PM, Tiv Taam, greengrocers, bakeries",
	"Restaurants":           "Restaurants, cafes and coffee shops, ice cream, takeaway and food delivery: Wolt, Ten Bis, Aroma, Cafe Greg, Landwer, Arcaffe, Golda, McDonald's, Pizza Hut, Burger Saloon",
	"Fuel":                  "Petrol stations: Paz, Sonol, Delek, Dor Alon, Ten, electric car charging",
	"Public Transport":      "Buses, trains and light rail: Rav-Kav top-ups, Israel Railways, Egged, Dan, Metropoline",
	"Taxi & Rideshare":      "Taxis and rides: Gett, Yango, Uber, Bolt",
	"Parking & Tolls":       "Parking and toll roads: Pango, Cellopark, Highway 6, Carmel Tunnels, parking lots",
	"Car":                   "Car costs other than fuel: garage, test, insurance, tyres, car wash, licence",
	"Rent & Mortgage":       "Rent paid to a landlord and mortgage payments",
	"Municipal Tax":         "Arnona, the city council property tax",
	"Electricity & Water":   "Israel Electric Corporation, water corporations (Maayanot HaSharon, Mei Avivim, Hagihon), gas bills",
	"Home & Garden":         "Furniture and home goods: IKEA, ACE, Tambour, plumbers, repairs, gardening",
	"Telecom & Internet":    "Phone and internet providers: Pelephone, Partner, Cellcom, Hot, Bezeq, 012, Yes",
	"Subscriptions":         "Recurring digital services: Netflix, Spotify, Apple, Google, YouTube, Disney, software, cloud storage",
	"Health":                "Doctors, dentists, therapy and health funds: Maccabi, Clalit, Meuhedet, Leumit, opticians",
	"Pharmacy":              "Pharmacies and drugstores: Super-Pharm, New-Pharm, Be",
	"Insurance":             "Life, health, apartment and travel insurance premiums",
	"Education":             "Tuition, courses, school and kindergarten fees, books for study",
	"Kids":                  "Children's costs: toys, clothes, activities, babysitters",
	"Family Transfers":      "Money you send to relatives: allowance or support for your children, parents or other family (the transfer says 'קרוב משפחה' or names a family member)",
	"Sports & Hobbies":      "Clubs, classes and dues for sports, martial arts and hobbies: dojo and judo clubs, Gikedo, Kendo Budo, swimming, dance, hall rental for training",
	"Clothing & Shoes":      "Clothes and shoes: Zara, H&M, Castro, Fox, Renuar, Golf, Nike, Foot Locker",
	"Electronics":           "Computers, phones and gadgets: KSP, Ivory, Bug, iDigital, Apple Store",
	"Entertainment":         "Cinema, shows, games and events: Cinema City, Yes Planet, Habima, Steam, PlayStation, tickets",
	"Travel & Vacation":     "Flights, hotels and holidays: El Al, Booking.com, Airbnb, Israir, Arkia, car rental abroad",
	"Gifts & Donations":     "Presents and charity donations",
	"Personal Care":         "Hairdresser, cosmetics, gym and spa: Super-Pharm beauty, barber, nails",
	"Pets":                  "Vets, pet food and pet shops: Pet Planet, Pet Plus",
	"Fees & Interest":       "Bank and card fees, interest and commissions",
	"Taxes":                 "Income tax, national insurance and other government payments",
	"Cash Withdrawal":       "ATM cash withdrawals",
	"Shopping":              "General shopping and online marketplaces: Amazon, AliExpress, Shein, Temu, department stores",
	"Salary":                "Pay received from an employer",
	"Refunds":               "Money returned by a shop or provider",
	"Credit cards":          "Bank debits where a credit-card company bills the checking account: Cal, Isracard, Leumi Card, Max",
	"Account Transfer":      "Money moved between your own accounts",
	"Savings & Investments": "Deposits to savings, study funds, pension, brokerage",
}

const descriptionsKey = "category_descriptions_filled"

// FillDescriptions gives the starter categories their merchant descriptions, once. It only fills empty
// descriptions, so anything you wrote yourself is kept, and it does not run again after you clear one.
func FillDescriptions(ctx context.Context, st *store.Store, l *ledger.Ledger) (int, error) {
	var v string
	if err := st.QueryRowContext(ctx, `SELECT value FROM settings WHERE key = ?`, descriptionsKey).Scan(&v); err == nil {
		return 0, nil
	}
	cats, err := l.ListCategories(ctx)
	if err != nil {
		return 0, err
	}
	n := 0
	for i := range cats {
		d, ok := seedDescriptions[cats[i].NameEN]
		if !ok || cats[i].Description != "" {
			continue
		}
		cats[i].Description = d
		if err := l.UpdateCategory(ctx, &cats[i]); err != nil {
			return n, err
		}
		n++
	}
	_, err = st.ExecContext(ctx, `INSERT OR REPLACE INTO settings (key, value) VALUES (?, '1')`, descriptionsKey)
	return n, err
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
		c := &ledger.Category{NameEN: s.en, NameHE: s.he, Type: s.typ, ColorHex: palette[i%len(palette)], Description: seedDescriptions[s.en], CreatedBy: ledger.ByUser}
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
