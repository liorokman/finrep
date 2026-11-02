package api

import (
	"net/http"
	"strings"
)

func (s *Server) routes(m *http.ServeMux) {
	m.HandleFunc("GET /healthz", s.healthz)

	m.HandleFunc("GET /auth/login", s.login)
	m.HandleFunc("GET /auth/callback", s.callback)
	m.HandleFunc("POST /auth/logout", s.logout)
	m.HandleFunc("GET /api/v1/auth/me", s.me)

	m.HandleFunc("GET /api/v1/accounts", s.listAccounts)
	m.HandleFunc("POST /api/v1/accounts", s.createAccount)
	m.HandleFunc("GET /api/v1/accounts/{id}", s.getAccount)
	m.HandleFunc("PATCH /api/v1/accounts/{id}", s.updateAccount)
	m.HandleFunc("DELETE /api/v1/accounts/{id}", s.deleteAccount)
	m.HandleFunc("PUT /api/v1/accounts/{id}/billing-rules", s.setBillingRules)

	m.HandleFunc("GET /api/v1/categories", s.listCategories)
	m.HandleFunc("POST /api/v1/categories", s.createCategory)
	m.HandleFunc("PATCH /api/v1/categories/{id}", s.updateCategory)
	m.HandleFunc("DELETE /api/v1/categories/{id}", s.deleteCategory)
	m.HandleFunc("POST /api/v1/categories/{id}/merge", s.mergeCategory)

	m.HandleFunc("GET /api/v1/transactions", s.listTransactions)
	m.HandleFunc("POST /api/v1/transactions", s.createTransaction)
	m.HandleFunc("PATCH /api/v1/transactions", s.bulkUpdateTransactions)
	m.HandleFunc("GET /api/v1/transactions/{id}", s.getTransaction)
	m.HandleFunc("DELETE /api/v1/transactions/{id}", s.deleteTransaction)

	m.HandleFunc("POST /api/v1/imports/inspect-csv", s.inspectCSV)
	m.HandleFunc("POST /api/v1/imports/stage", s.stageImport)
	m.HandleFunc("POST /api/v1/imports/staged/{id}/commit", s.commitImport)
	m.HandleFunc("DELETE /api/v1/imports/staged/{id}", s.discardStaged)
	m.HandleFunc("GET /api/v1/imports", s.listBatches)
	m.HandleFunc("POST /api/v1/imports/{id}/undo", s.undoBatch)

	m.HandleFunc("POST /api/v1/categorization/runs", s.startCategorization)
	m.HandleFunc("GET /api/v1/categorization/runs", s.listRuns)
	m.HandleFunc("GET /api/v1/categorization/runs/{id}", s.getRun)
	m.HandleFunc("POST /api/v1/categorization/runs/{id}/undo", s.undoRun)
	m.HandleFunc("POST /api/v1/categorization/cancel", s.cancelCategorization)

	m.HandleFunc("GET /api/v1/statements", s.listStatements)
	m.HandleFunc("POST /api/v1/settlements", s.createSettlement)
	m.HandleFunc("DELETE /api/v1/settlements/{id}", s.deleteSettlement)
	m.HandleFunc("GET /api/v1/settlements/proposals", s.listProposals)
	m.HandleFunc("POST /api/v1/settlements/proposals/confirm", s.confirmProposal)
	m.HandleFunc("POST /api/v1/settlements/proposals/confirm-all", s.confirmAllProposals)
	m.HandleFunc("POST /api/v1/settlements/activity", s.linkActivity)
	m.HandleFunc("POST /api/v1/external-payments", s.markExternal)
	m.HandleFunc("DELETE /api/v1/external-payments/{id}", s.unmarkExternal)
	m.HandleFunc("GET /api/v1/billing/review", s.billingReview)
	m.HandleFunc("GET /api/v1/billing/upcoming", s.upcoming)
	m.HandleFunc("GET /api/v1/billing/card-spend", s.cardSpend)

	m.HandleFunc("GET /api/v1/reports/{name}", s.report)

	m.HandleFunc("GET /api/v1/settings", s.getSettings)
	m.HandleFunc("PUT /api/v1/settings", s.putSettings)
	m.HandleFunc("POST /api/v1/settings/test-llm", s.testLLM)

	// Anything else under /api/ is a JSON error rather than the mux's text page: 405 when the path exists
	// for another method, 404 otherwise.
	m.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		var allow []string
		for _, method := range []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete} {
			probe := r.Clone(r.Context())
			probe.Method = method
			if _, pattern := m.Handler(probe); pattern != "" && pattern != "/api/" {
				allow = append(allow, method)
			}
		}
		if len(allow) > 0 {
			w.Header().Set("Allow", strings.Join(allow, ", "))
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		writeError(w, http.StatusNotFound, "no such endpoint")
	})
}
