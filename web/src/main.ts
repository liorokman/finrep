import './styles/main.css';
import {
  renderCategoryDonutChart,
  renderCashFlowChart,
  renderNetWorthChart,
  renderCCPayoffChart,
} from './charts';

// ---- Interfaces ----

interface Account {
  id: string;
  name: string;
  account_type: string;
  institution: string;
  currency: string;
  opening_balance: number;
  current_balance?: number;
  credit_limit?: number;
  billing_day_primary?: number;
  billing_day_secondary?: number;
}

interface Transaction {
  id: string;
  account_id: string;
  account_name: string;
  date: string;
  amount: number;
  currency: string;
  payee_raw: string;
  category_id?: string;
  category_name_en?: string;
  category_name_he?: string;
  suggested_category_he?: string;
  suggested_category_en?: string;
  suggested_category_type?: string;
  current_installment?: number;
  total_installments?: number;
  is_reviewed: boolean;
  billing_date?: string;
  billing_day?: number;
  original_amount?: number;
  original_currency?: string;
}

interface Category {
  id: string;
  name_he: string;
  name_en: string;
  color_hex: string;
  icon: string;
  category_type: string;
  monthly_budget?: number;
}

interface BudgetVsActual {
  category_id: string;
  category_name: string;
  monthly_budget: number;
  actual_spent: number;
  variance: number;
}

interface Subscription {
  payee: string;
  category_name: string;
  monthly_cost: number;
  occurrence_count: number;
}

interface MoMCell {
  month: string;
  amount: number;
}

interface MoMRow {
  category_name: string;
  color_hex: string;
  months: MoMCell[];
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface NetWorthPoint {
  date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
}

interface CCPayoffItem {
  month: string;
  installment_cost: number;
}

interface ForeignCurrencyItem {
  original_currency: string;
  original_total: number;
  ils_billed_total: number;
  implied_avg_rate: number;
}

interface AnomalyItem {
  transaction_id: string;
  date: string;
  payee: string;
  amount: number;
  reason: string;
}

// ---- App State ----

let activeTab = 'dashboard';
let accountsList: Account[] = [];
let transactionsList: Transaction[] = [];;
let categoriesList: Category[] = [];
let budgetVsActualList: BudgetVsActual[] = [];
let subscriptionsList: Subscription[] = [];
let donutChartData: any[] = [];
let cashFlowChartData: any[] = [];
let netWorthData: NetWorthPoint[] = [];
let ccPayoffData: CCPayoffItem[] = [];
let foreignCurrencyData: ForeignCurrencyItem[] = [];
let anomalyData: AnomalyItem[] = [];
let momHeatmapData: MoMRow[] = [];
let sankeyData: SankeyLink[] = [];
let settingsData: Record<string, string> = {};
let authInfo: any = null;

let txTotal = 0;
let txPage = 0;
let txLimit = 25;

// Transactions Filter state
let txFilterAccountID = '';
let txFilterCategoryType = '';
let txFilterCategoryIDs: string[] = [];
let txFilterStartDate = '';
let txFilterEndDate = '';
let txFilterSearch = '';
let isCatDropdownOpen = false;
let isUnauthenticated = false;

// Auto-Categorization state
interface BatchDetail {
  index: number;
  status: string;
  tx_count: number;
  error?: string;
  results?: Array<{
    transaction_id: string;
    payee_raw?: string;
    date?: string;
    amount?: number;
    currency?: string;
    category_id?: string;
    category_name_en?: string;
    category_name_he?: string;
    suggested_category?: { name_he: string; name_en: string; category_type: string };
    confidence?: number;
  }>;
  completed_at?: string;
}

interface CategorizationStatus {
  running: boolean;
  canceled: boolean;
  processed: number;
  total: number;
  current_batch: number;
  total_batches: number;
  last_error?: string;
  batches?: BatchDetail[];
}

let categorizationStatus: CategorizationStatus = {
  running: false,
  canceled: false,
  processed: 0,
  total: 0,
  current_batch: 0,
  total_batches: 0,
  batches: [],
};

let autoCatPrompt = '';
let autoCatDefaultPrompt = '';
let selectedBatchResults: BatchDetail | null = null;
let autoCatPollTimer: any = null;

function getDefaultMonthRange() {
  const now = new Date();
  const toYear = now.getFullYear();
  const toMonth = String(now.getMonth() + 1).padStart(2, '0');
  const toStr = `${toYear}-${toMonth}`;

  const fromDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const fromYear = fromDate.getFullYear();
  const fromMonth = String(fromDate.getMonth() + 1).padStart(2, '0');
  const fromStr = `${fromYear}-${fromMonth}`;

  return { fromStr, toStr };
}

const defaultRange = getDefaultMonthRange();

// Per-widget filter state
let widgetFilters = {
  cashflowAcc: '',
  cashflowFromMonth: defaultRange.fromStr,
  cashflowToMonth: defaultRange.toStr,
  donutAcc: '',
  donutFromMonth: defaultRange.fromStr,
  donutToMonth: defaultRange.toStr,
  networthFromMonth: defaultRange.fromStr,
  networthToMonth: defaultRange.toStr,
  payoffAcc: '',
  budgetAcc: '',
  subscriptionsAcc: '',
  momAcc: '',
  momFromMonth: defaultRange.fromStr,
  momToMonth: defaultRange.toStr,
};

function renderWidgetAccountSelector(id: string, currentValue: string) {
  return `
    <select id="${id}" class="bg-slate-900 border border-slate-700/80 rounded-md px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-brand-500">
      <option value="">All Accounts</option>
      ${accountsList.map(a => `<option value="${a.id}" ${currentValue === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
    </select>
  `;
}

let showAddAccountModal = false;
let showAddCategoryModal = false;
let editingCategory: Category | null = null;

interface BillingCycle {
  id: string;
  account_id: string;
  account_name?: string;
  billing_day: number;
  cycle_start_date: string;
  cycle_end_date: string;
  expected_bill_date: string;
  status: 'OPEN' | 'BILLED' | 'PAID' | 'PARTIAL';
  expected_amount: number;
  bank_transaction_id?: string;
  paid_amount: number;
  created_at: string;
  updated_at: string;
}

// Billing Cycle state
let billingCyclesList: BillingCycle[] = [];
let selectedCycleAccountID: string = '';
let selectedCycleStatusFilter: string = '';
let activeCycleDetail: { billing_cycle: BillingCycle; transactions: Transaction[] } | null = null;
let cycleBankCandidates: Transaction[] = [];
let selectedCandidateID: string = '';
let showGenerateCyclesModal: boolean = false;
let generateFromMonth: string = '';
let generateToMonth: string = '';
let generateAccountID: string = '';

// ---- Utilities ----

function formatMoney(num?: number): string {
  const val = num ?? 0;
  return `₪ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getBalance(a: Account): number {
  return a.current_balance ?? a.opening_balance ?? 0;
}

// ---- Toast System ----

function createToastContainer(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'toast-container';
  document.body.appendChild(el);
  return el;
}

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const container = document.getElementById('toast-container') ?? createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}

// ---- Data Loading ----

async function initApp() {
  const app = document.getElementById('app');
  if (!app) return;
  await loadData();
  renderApp();
}

async function loadData() {
  try {
    const txParams = new URLSearchParams({
      limit: String(txLimit),
      offset: String(txPage * txLimit),
    });
    if (txFilterAccountID) txParams.set('account_id', txFilterAccountID);
    if (txFilterCategoryType) txParams.set('category_type', txFilterCategoryType);
    if (txFilterStartDate) txParams.set('start_date', txFilterStartDate);
    if (txFilterEndDate) txParams.set('end_date', txFilterEndDate);
    if (txFilterSearch) txParams.set('search', txFilterSearch);

    const [accRes, txRes, catRes, bvaRes, subRes, donutRes, cfRes, authRes,
           nwRes, ccRes, fxRes, anomRes, momRes, sankeyRes, settingsRes, promptRes, statusRes] = await Promise.all([
      fetch('/api/v1/accounts'),
      fetch(`/api/v1/transactions?${txParams.toString()}`),
      fetch('/api/v1/categories'),
      fetch(`/api/v1/reports/budget-vs-actual?account_id=${widgetFilters.budgetAcc}`),
      fetch(`/api/v1/reports/subscriptions?account_id=${widgetFilters.subscriptionsAcc}`),
      fetch(`/api/v1/reports/category-donut?account_id=${widgetFilters.donutAcc}&start_date=${widgetFilters.donutFromMonth}&end_date=${widgetFilters.donutToMonth}`),
      fetch(`/api/v1/reports/cash-flow?account_id=${widgetFilters.cashflowAcc}&start_date=${widgetFilters.cashflowFromMonth}&end_date=${widgetFilters.cashflowToMonth}`),
      fetch('/api/v1/auth/info'),
      fetch(`/api/v1/reports/net-worth?start_date=${widgetFilters.networthFromMonth}&end_date=${widgetFilters.networthToMonth}`),
      fetch(`/api/v1/reports/cc-payoff?account_id=${widgetFilters.payoffAcc}`),
      fetch('/api/v1/reports/foreign-currency'),
      fetch('/api/v1/reports/anomalies'),
      fetch(`/api/v1/reports/mom-heatmap?account_id=${widgetFilters.momAcc}&start_date=${widgetFilters.momFromMonth}&end_date=${widgetFilters.momToMonth}`),
      fetch('/api/v1/reports/sankey'),
      fetch('/api/v1/settings'),
      fetch('/api/v1/categorize/prompt'),
      fetch('/api/v1/categorize/status'),
    ]);

    if (accRes.status === 401 || txRes.status === 401) {
      isUnauthenticated = true;
      if (authRes.ok) authInfo = await authRes.json();
      return;
    }
    isUnauthenticated = false;

    if (accRes.ok) accountsList = (await accRes.json()) || [];
    if (txRes.ok) {
      const data = await txRes.json();
      transactionsList = data.transactions || [];
      txTotal = data.total ?? transactionsList.length;
    }
    if (catRes.ok) categoriesList = (await catRes.json()) || [];
    if (bvaRes.ok) budgetVsActualList = (await bvaRes.json()) || [];
    if (subRes.ok) subscriptionsList = (await subRes.json()) || [];
    if (donutRes.ok) donutChartData = (await donutRes.json()) || [];
    if (cfRes.ok) cashFlowChartData = (await cfRes.json()) || [];
    if (authRes.ok) authInfo = await authRes.json();
    if (nwRes.ok) netWorthData = (await nwRes.json()) || [];
    if (ccRes.ok) ccPayoffData = (await ccRes.json()) || [];
    if (fxRes.ok) foreignCurrencyData = (await fxRes.json()) || [];
    if (anomRes.ok) anomalyData = (await anomRes.json()) || [];
    if (momRes.ok) momHeatmapData = (await momRes.json()) || [];
    if (sankeyRes.ok) sankeyData = (await sankeyRes.json()) || [];
    if (settingsRes.ok) settingsData = (await settingsRes.json()) || {};
    if (promptRes && promptRes.ok) {
      const pData = await promptRes.json();
      autoCatPrompt = pData.prompt || '';
      autoCatDefaultPrompt = pData.default_prompt || '';
    }
    if (statusRes && statusRes.ok) {
      categorizationStatus = await statusRes.json();
    }
    await fetchBillingCycles();
  } catch (e) {
    console.error('Failed to fetch data from API server', e);
  }
}

async function fetchBillingCycles() {
  try {
    const params = new URLSearchParams();
    if (selectedCycleAccountID) params.set('account_id', selectedCycleAccountID);
    if (selectedCycleStatusFilter) params.set('status', selectedCycleStatusFilter);
    const res = await fetch(`/api/v1/billing-cycles?${params.toString()}`);
    if (res.ok) {
      billingCyclesList = (await res.json()) || [];
    }
  } catch (e) {
    console.error('Failed to fetch billing cycles', e);
  }
}

async function loadTransactions() {
  try {
    const params = new URLSearchParams({
      limit: String(txLimit),
      offset: String(txPage * txLimit),
    });
    if (txFilterAccountID) params.set('account_id', txFilterAccountID);
    if (txFilterCategoryType) params.set('category_type', txFilterCategoryType);
    if (txFilterCategoryIDs.length > 0) params.set('category_ids', txFilterCategoryIDs.join(','));
    if (txFilterStartDate) params.set('start_date', txFilterStartDate);
    if (txFilterEndDate) params.set('end_date', txFilterEndDate);
    if (txFilterSearch) params.set('search', txFilterSearch);

    const res = await fetch(`/api/v1/transactions?${params.toString()}`);
    if (res.status === 401) {
      isUnauthenticated = true;
      renderApp();
      return;
    }
    if (res.ok) {
      const data = await res.json();
      transactionsList = data.transactions || [];
      txTotal = data.total ?? transactionsList.length;
    }
  } catch (e) {
    console.error('Failed to load transactions', e);
  }
}

// ---- App Shell ----

function renderLoginView() {
  return `
    <div class="min-h-[65vh] flex items-center justify-center py-12 px-4">
      <div class="glass-panel p-8 sm:p-12 max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden border-slate-700/80">
        <!-- Background Glow Accent -->
        <div class="absolute -top-16 -left-16 w-40 h-40 bg-brand-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-16 -right-16 w-40 h-40 bg-purple-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Logo Icon -->
        <div class="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-500 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl shadow-brand-500/25">
          $
        </div>

        <div>
          <h2 class="text-2xl font-extrabold text-white tracking-tight">FinRep Ledger</h2>
          <p class="text-xs text-slate-400 mt-1">Financial Reporting &amp; Intelligent Ledger</p>
        </div>

        <div class="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-left space-y-2">
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Single Sign-On (SSO) Required
          </div>
          <p class="text-[11px] text-slate-400 leading-relaxed">
            This application is protected with OpenID Connect (OIDC). Authenticate with your SSO identity provider to access financial reports and ledger data.
          </p>
        </div>

        <div class="pt-2">
          <a id="btn-login-oidc" href="/auth/login" class="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-sm shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 transition duration-200 group cursor-pointer">
            <span>🔑 Log in with Single Sign-On (OIDC)</span>
            <span class="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
          </a>
        </div>

        <div class="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <span>Shielded by</span>
          <span class="font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Authentik OIDC (PKCE 2.0)</span>
        </div>
      </div>
    </div>
  `;
}

function renderApp() {
  const app = document.getElementById('app');
  if (!app) return;

  const totalAssets = accountsList
    .map(a => getBalance(a))
    .filter(bal => bal >= 0)
    .reduce((sum, bal) => sum + bal, 0);

  const totalLiabilities = accountsList
    .map(a => getBalance(a))
    .filter(bal => bal < 0)
    .reduce((sum, bal) => sum + Math.abs(bal), 0);

  const netWorth = totalAssets - totalLiabilities;
  const pendingSuggestionsCount = transactionsList.filter(t => t.suggested_category_en).length;

  const showLoginView = isUnauthenticated || (authInfo?.oidc_enabled && !authInfo?.user);

  app.innerHTML = `
    <!-- Top Navigation Header -->
    <header class="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-500 flex items-center justify-center font-bold text-white shadow-lg shadow-brand-500/20">
            $
          </div>
          <div>
            <h1 class="font-bold tracking-tight text-lg text-white">FinRep Ledger</h1>
            <p class="text-xs text-slate-400">Financial Reporting &amp; LocalAI Ledger</p>
          </div>
        </div>

        ${!showLoginView ? `
          <nav class="flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/60 flex-wrap">
            ${renderNavButton('dashboard', '📊 Dashboard')}
            ${renderNavButton('accounts', '🏦 Accounts')}
            ${renderNavButton('transactions', '💳 Transactions')}
            ${renderNavButton('categories', '🏷️ Categories')}
            ${renderNavButton('autocat', '✨ Auto-Categorization')}
            ${renderNavButton('import', '📤 Import')}
            ${renderNavButton('reconciliation', '🔗 Reconciliation')}
            ${renderNavButton('settings', '⚙️ Settings')}
          </nav>
        ` : ''}

        <div class="flex items-center gap-3">
          ${authInfo?.user ? `
            <div class="flex items-center gap-2.5">
              <span class="text-xs px-3 py-1.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5 font-medium shadow-sm">
                <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                👤 ${authInfo.user.name || authInfo.user.email}
              </span>
              ${authInfo.oidc_enabled ? `
                <a href="/auth/logout" class="text-xs text-rose-300 hover:text-rose-200 font-semibold transition px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 flex items-center gap-1 shadow-sm">
                  <span>🚪 Logout</span>
                </a>
              ` : ''}
            </div>
          ` : `
            <span class="text-xs text-slate-400 font-medium px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              Single Sign-On
            </span>
          `}
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
      ${showLoginView ? renderLoginView() : `
        ${activeTab === 'dashboard' ? renderDashboard(netWorth, totalAssets, totalLiabilities) : ''}
        ${activeTab === 'accounts' ? renderAccountsView() : ''}
        ${activeTab === 'transactions' ? renderTransactionsView() : ''}
        ${activeTab === 'categories' ? renderCategoriesView() : ''}
        ${activeTab === 'autocat' ? renderAutoCategorizationView() : ''}
        ${activeTab === 'import' ? renderImportView() : ''}
        ${activeTab === 'reconciliation' ? renderBillingCyclesView() : ''}
        ${activeTab === 'settings' ? renderSettingsView() : ''}
      `}
    </main>

    ${showAddAccountModal ? renderAccountModal() : ''}
    ${showAddCategoryModal || editingCategory ? renderCategoryModal() : ''}
    ${selectedBatchResults ? renderBatchResultsModal() : ''}

    <!-- Footer -->
    <footer class="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
      Financial Reporting Application &copy; 2026 &bull; Powered by Go + Echo + Vite + LocalAI
    </footer>
  `;

  attachEvents();

  if (activeTab === 'dashboard') {
    setTimeout(() => {
      renderCategoryDonutChart('donut-chart-canvas', donutChartData);
      renderCashFlowChart('cashflow-chart-canvas', cashFlowChartData);
      renderNetWorthChart('networth-chart-canvas', netWorthData);
      renderCCPayoffChart('ccpayoff-chart-canvas', ccPayoffData);
      renderMoMHeatmap();
    }, 50);
  }
}

function renderNavButton(id: string, label: string) {
  const isActive = activeTab === id;
  return `
    <button class="nav-tab px-3 py-1.5 rounded-lg text-xs font-medium transition ${
      isActive
        ? 'bg-brand-600 text-white shadow-md'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
    }" data-tab="${id}">
      ${label}
    </button>
  `;
}

// ---- Dashboard ----

function renderDashboard(netWorth: number, assets: number, liabilities: number) {
  const momMonths = momHeatmapData.length > 0 ? momHeatmapData[0].months.map(m => m.month) : [];
  const maxMoM = momHeatmapData.flatMap(r => r.months.map(m => m.amount)).reduce((a, b) => Math.max(a, b), 1);

  return `
    <div class="space-y-8">
      <!-- Metric Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass-panel p-6 relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-brand-500/10 rounded-full blur-xl"></div>
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Net Worth (ILS)</p>
          <h2 class="text-3xl font-extrabold text-white mt-2">${formatMoney(netWorth)}</h2>
          <span class="text-xs text-emerald-400 mt-2 inline-block">↑ Aggregated across accounts</span>
        </div>

        <div class="glass-panel p-6 relative overflow-hidden">
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Assets</p>
          <h2 class="text-3xl font-extrabold text-emerald-400 mt-2">${formatMoney(assets)}</h2>
          <span class="text-xs text-slate-500 mt-2 inline-block">Bank &amp; Liquid Cash</span>
        </div>

        <div class="glass-panel p-6 relative overflow-hidden">
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Liabilities &amp; Card Balances</p>
          <h2 class="text-3xl font-extrabold text-rose-400 mt-2">${formatMoney(liabilities)}</h2>
          <span class="text-xs text-slate-500 mt-2 inline-block">Credit Card Billed Liabilities</span>
        </div>
      </div>

      <!-- Charts Row 1: Cash Flow + Category Donut -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-panel p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <h3 class="font-bold text-sm text-white flex items-center gap-2">
                <span>Monthly Cash Flow</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
                  ${cashFlowChartData.length} Months (${widgetFilters.cashflowFromMonth} to ${widgetFilters.cashflowToMonth})
                </span>
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">Income vs Expenses breakdown</p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <!-- Quick Presets -->
              <div class="inline-flex rounded-md border border-slate-800 bg-slate-950 p-0.5 text-[11px]">
                <button id="btn-cashflow-preset-3m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${cashFlowChartData.length === 3 ? 'bg-brand-600 text-white font-bold' : ''}">3M</button>
                <button id="btn-cashflow-preset-6m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${cashFlowChartData.length === 6 ? 'bg-brand-600 text-white font-bold' : ''}">6M</button>
                <button id="btn-cashflow-preset-12m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${cashFlowChartData.length === 12 ? 'bg-brand-600 text-white font-bold' : ''}">12M</button>
              </div>

              <!-- Month Pickers -->
              <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-[11px]">
                <span class="text-slate-400">From:</span>
                <input type="month" id="widget-cashflow-from" value="${widgetFilters.cashflowFromMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
                <span class="text-slate-400">To:</span>
                <input type="month" id="widget-cashflow-to" value="${widgetFilters.cashflowToMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
              </div>

              <!-- Account Selector -->
              ${renderWidgetAccountSelector('widget-acc-cashflow', widgetFilters.cashflowAcc)}
            </div>
          </div>
          <div class="h-64 relative">
            <canvas id="cashflow-chart-canvas"></canvas>
          </div>
        </div>
        <div class="glass-panel p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <h3 class="font-bold text-sm text-white flex items-center gap-2">
                <span>Category Expense Breakdown</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
                  ${widgetFilters.donutFromMonth} to ${widgetFilters.donutToMonth}
                </span>
              </h3>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <!-- Quick Presets -->
              <div class="inline-flex rounded-md border border-slate-800 bg-slate-950 p-0.5 text-[11px]">
                <button id="btn-donut-preset-3m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition">3M</button>
                <button id="btn-donut-preset-6m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition">6M</button>
                <button id="btn-donut-preset-12m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition">12M</button>
              </div>

              <!-- Month Pickers -->
              <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-[11px]">
                <span class="text-slate-400">From:</span>
                <input type="month" id="widget-donut-from" value="${widgetFilters.donutFromMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
                <span class="text-slate-400">To:</span>
                <input type="month" id="widget-donut-to" value="${widgetFilters.donutToMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
              </div>

              <!-- Account Selector -->
              ${renderWidgetAccountSelector('widget-acc-donut', widgetFilters.donutAcc)}
            </div>
          </div>
          <div class="h-64 relative">
            <canvas id="donut-chart-canvas"></canvas>
          </div>
        </div>
      </div>

      <!-- Charts Row 2: Net Worth Trend + CC Payoff -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-panel p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <h3 class="font-bold text-sm text-white flex items-center gap-2">
                <span>Net Worth Over Time</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
                  ${netWorthData.length} Points (${widgetFilters.networthFromMonth} to ${widgetFilters.networthToMonth})
                </span>
              </h3>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <!-- Quick Presets -->
              <div class="inline-flex rounded-md border border-slate-800 bg-slate-950 p-0.5 text-[11px]">
                <button id="btn-networth-preset-3m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${netWorthData.length === 3 ? 'bg-brand-600 text-white font-bold' : ''}">3M</button>
                <button id="btn-networth-preset-6m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${netWorthData.length === 6 ? 'bg-brand-600 text-white font-bold' : ''}">6M</button>
                <button id="btn-networth-preset-12m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${netWorthData.length === 12 ? 'bg-brand-600 text-white font-bold' : ''}">12M</button>
              </div>

              <!-- Month Pickers -->
              <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-[11px]">
                <span class="text-slate-400">From:</span>
                <input type="month" id="widget-networth-from" value="${widgetFilters.networthFromMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
                <span class="text-slate-400">To:</span>
                <input type="month" id="widget-networth-to" value="${widgetFilters.networthToMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
              </div>
            </div>
          </div>
          <div class="h-64 relative">
            <canvas id="networth-chart-canvas"></canvas>
          </div>
        </div>
        <div class="glass-panel p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm text-white">Installment Payoff Forecast</h3>
            ${renderWidgetAccountSelector('widget-acc-payoff', widgetFilters.payoffAcc)}
          </div>
          <div class="h-64 relative">
            ${ccPayoffData.length === 0
              ? `<div class="flex items-center justify-center h-full text-slate-500 text-xs">No installment transactions found.</div>`
              : `<canvas id="ccpayoff-chart-canvas"></canvas>`}
          </div>
        </div>
      </div>

      <!-- Budget vs Actual & Subscriptions -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-panel p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm text-white">Budget vs Actual (This Month)</h3>
            ${renderWidgetAccountSelector('widget-acc-budget', widgetFilters.budgetAcc)}
          </div>
          <div class="space-y-3">
            ${budgetVsActualList.length === 0
              ? `<p class="text-xs text-slate-500">No category budgets defined yet. Set budgets in the Categories tab.</p>`
              : budgetVsActualList.map(b => {
                  const pct = b.monthly_budget > 0 ? Math.min(100, (b.actual_spent / b.monthly_budget) * 100) : 0;
                  const over = b.actual_spent > b.monthly_budget && b.monthly_budget > 0;
                  return `
                    <div class="space-y-1">
                      <div class="flex justify-between text-xs">
                        <span class="text-slate-300 font-medium">${b.category_name}</span>
                        <span class="${over ? 'text-rose-400 font-bold' : 'text-slate-400'}">${formatMoney(b.actual_spent)} / ${formatMoney(b.monthly_budget)}</span>
                      </div>
                      <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div class="h-2 rounded-full transition-all ${over ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-brand-500'}" style="width: ${pct}%"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
          </div>
        </div>

        <div class="glass-panel p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm text-white">Recurring Fixed Subscriptions</h3>
            ${renderWidgetAccountSelector('widget-acc-subscriptions', widgetFilters.subscriptionsAcc)}
          </div>
          <div class="space-y-2">
            ${subscriptionsList.length === 0
              ? `<p class="text-xs text-slate-500">No recurring subscriptions detected.</p>`
              : subscriptionsList.slice(0, 8).map(s => `
                  <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div>
                      <h4 class="text-xs font-bold text-white">${s.payee}</h4>
                      <span class="text-xs text-slate-400">${s.category_name} &bull; ${s.occurrence_count} occurrences</span>
                    </div>
                    <span class="text-xs font-bold text-rose-400 font-mono">${formatMoney(s.monthly_cost)}/mo</span>
                  </div>
                `).join('')}
          </div>
        </div>
      </div>

      <!-- MoM Heatmap -->
      <div class="glass-panel p-6 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div>
            <h3 class="font-bold text-sm text-white flex items-center gap-2">
              <span>Month-over-Month Spending Heatmap</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
                ${momMonths.length} Months (${widgetFilters.momFromMonth} to ${widgetFilters.momToMonth})
              </span>
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">Track category expense trends month by month</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Quick Presets -->
            <div class="inline-flex rounded-md border border-slate-800 bg-slate-950 p-0.5 text-[11px]">
              <button id="btn-mom-preset-3m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${momMonths.length === 3 ? 'bg-brand-600 text-white font-bold' : ''}">3M</button>
              <button id="btn-mom-preset-6m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${momMonths.length === 6 ? 'bg-brand-600 text-white font-bold' : ''}">6M</button>
              <button id="btn-mom-preset-12m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${momMonths.length === 12 ? 'bg-brand-600 text-white font-bold' : ''}">12M</button>
            </div>

            <!-- Month Pickers -->
            <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-[11px]">
              <span class="text-slate-400">From:</span>
              <input type="month" id="widget-mom-from" value="${widgetFilters.momFromMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
              <span class="text-slate-400">To:</span>
              <input type="month" id="widget-mom-to" value="${widgetFilters.momToMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
            </div>

            <!-- Account Selector -->
            ${renderWidgetAccountSelector('widget-acc-mom', widgetFilters.momAcc)}
          </div>
        </div>

        ${momHeatmapData.length === 0
          ? `<p class="text-xs text-slate-500 py-6 text-center">No categorized expense data found for selected month range.</p>`
          : `<div id="mom-heatmap-container" class="overflow-x-auto">
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr class="border-b border-slate-800">
                    <th class="text-left py-2.5 pr-4 text-slate-400 font-medium sticky left-0 bg-slate-950/95 z-10 min-w-[140px]">Category</th>
                    ${momMonths.map(m => `<th class="text-center py-2.5 px-2 text-slate-400 font-medium font-mono min-w-[75px]">${m}</th>`).join('')}
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/40" id="mom-heatmap-tbody">
                  ${momHeatmapData.map(row => `
                    <tr class="hover:bg-slate-900/40 transition">
                      <td class="py-2.5 pr-4 text-slate-300 font-medium flex items-center gap-2 sticky left-0 bg-slate-950/95 z-10 min-w-[140px]">
                        <span class="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style="background:${row.color_hex}"></span>
                        <span class="truncate">${row.category_name}</span>
                      </td>
                      ${row.months.map(cell => {
                        const intensity = maxMoM > 0 ? cell.amount / maxMoM : 0;
                        const alpha = (0.1 + intensity * 0.75).toFixed(2);
                        return `<td class="py-2.5 px-2 text-center rounded font-mono min-w-[75px]" style="background:${cell.amount > 0 ? `rgba(244,63,94,${alpha})` : 'transparent'}">
                          ${cell.amount > 0 ? formatMoney(cell.amount) : '-'}
                        </td>`;
                      }).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`}
      </div>

      <!-- Sankey Flow (simplified HTML table) -->
      <div class="glass-panel p-6 space-y-4">
        <h3 class="font-bold text-sm text-white">Income → Expense Flow (Current Month)</h3>
        ${sankeyData.length === 0
          ? `<p class="text-xs text-slate-500">No flow data for current month.</p>`
          : `<div class="space-y-2">
              ${sankeyData.slice(0, 15).map(link => `
                <div class="flex items-center gap-3 text-xs">
                  <span class="text-slate-300 w-40 truncate font-medium">${link.source}</span>
                  <div class="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
                    <div class="h-3 rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all"
                         style="width: ${Math.min(100, (link.value / (sankeyData[0]?.value || 1)) * 100)}%"></div>
                  </div>
                  <span class="text-slate-300 w-40 truncate">${link.target}</span>
                  <span class="text-slate-400 font-mono w-28 text-right">${formatMoney(link.value)}</span>
                </div>
              `).join('')}
            </div>`}
      </div>

      <!-- Foreign Currency & Anomalies -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-panel p-6 space-y-4">
          <h3 class="font-bold text-sm text-white">Foreign Currency Analysis</h3>
          ${foreignCurrencyData.length === 0
            ? `<p class="text-xs text-slate-500">No foreign currency transactions found.</p>`
            : `<table class="w-full text-xs">
                <thead><tr class="text-slate-400 border-b border-slate-800">
                  <th class="text-left py-2">Currency</th>
                  <th class="text-right py-2">Original Total</th>
                  <th class="text-right py-2">ILS Billed</th>
                  <th class="text-right py-2">Avg Rate</th>
                </tr></thead>
                <tbody class="divide-y divide-slate-800/40">
                  ${foreignCurrencyData.map(fx => `
                    <tr>
                      <td class="py-2 font-bold text-white">${fx.original_currency}</td>
                      <td class="py-2 text-right text-slate-300">${fx.original_total.toFixed(2)}</td>
                      <td class="py-2 text-right text-slate-300">${formatMoney(fx.ils_billed_total)}</td>
                      <td class="py-2 text-right text-brand-400 font-mono">${fx.implied_avg_rate.toFixed(4)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>`}
        </div>

        <div class="glass-panel p-6 space-y-4">
          <h3 class="font-bold text-sm text-white">Transaction Anomalies</h3>
          ${anomalyData.length === 0
            ? `<p class="text-xs text-slate-500">No anomalies detected.</p>`
            : `<div class="space-y-2">
                ${anomalyData.map(a => `
                  <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-white truncate max-w-[180px]">${a.payee}</span>
                      <span class="text-xs font-bold text-rose-400 font-mono">${formatMoney(a.amount)}</span>
                    </div>
                    <div class="flex items-center justify-between mt-1">
                      <span class="text-xs text-slate-400">${a.date}</span>
                      <span class="text-xs text-amber-400">${a.reason}</span>
                    </div>
                  </div>
                `).join('')}
              </div>`}
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="glass-panel p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-lg text-white">Recent Transactions</h3>
          <span class="text-xs text-slate-400">${transactionsList.length} loaded</span>
        </div>
        ${renderTransactionTableRows(transactionsList.slice(0, 10))}
      </div>
    </div>
  `;
}

function renderMoMHeatmap() {
  // Already rendered inline in dashboard HTML; nothing extra needed
}

// ---- Accounts View ----

function renderAccountsView() {
  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white">Financial Accounts</h2>
          <p class="text-xs text-slate-400 mt-1">Manage Bank Accounts and Credit Cards</p>
        </div>
        <button id="btn-add-account" class="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-lg shadow-brand-500/20 transition">
          + Add Account
        </button>
      </div>

      ${accountsList.length === 0 ? `
        <div class="glass-panel p-12 text-center space-y-3">
          <div class="text-4xl">🏦</div>
          <p class="text-sm text-slate-400">No financial accounts registered yet.</p>
          <button id="btn-add-account-empty" class="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow">
            + Create First Account
          </button>
        </div>
      ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${accountsList.map(a => {
            const bal = getBalance(a);
            return `
              <div class="glass-card flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold ${a.account_type === 'BANK' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}">
                      ${a.account_type}
                    </span>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-slate-500 font-mono">${a.institution}</span>
                      <button class="btn-delete-account text-slate-500 hover:text-rose-400 text-xs px-1.5 py-0.5 rounded transition" data-id="${a.id}">✕</button>
                    </div>
                  </div>
                  <h3 class="text-lg font-bold text-white mt-3">${a.name}</h3>
                  <p class="text-xs text-slate-400">Currency: ${a.currency}</p>
                </div>
                <div class="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span class="text-xs text-slate-400">Current Balance</span>
                  <span class="text-xl font-extrabold ${bal >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                    ${formatMoney(bal)}
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

function renderAccountModal() {
  return `
    <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="glass-panel max-w-md w-full p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-lg font-bold text-white">Add Financial Account</h3>
          <button id="btn-close-modal" class="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        <form id="form-account" class="space-y-4">
          <div id="modal-error-msg" class="hidden p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium"></div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Account Name</label>
            <input type="text" id="acc-name" required placeholder="e.g. Bank Hapoalim Checking" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Account Type</label>
              <select id="acc-type" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                <option value="BANK">BANK</option>
                <option value="CREDIT_CARD">CREDIT_CARD</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Institution</label>
              <input type="text" id="acc-institution" required placeholder="e.g. Hapoalim" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Currency</label>
              <select id="acc-currency" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                <option value="ILS">ILS (₪)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Opening Balance</label>
              <input type="number" step="0.01" id="acc-balance" value="0.00" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>

          <div id="acc-cc-billing-block" class="grid grid-cols-2 gap-3 p-3 rounded-lg bg-brand-500/10 border border-brand-500/20">
            <div>
              <label class="block text-xs font-semibold text-brand-300 mb-1">Primary Billing Day (1-31)</label>
              <input type="number" min="1" max="31" id="acc-billing-primary" value="10" placeholder="e.g. 10" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Secondary Day (Optional)</label>
              <input type="number" min="1" max="31" id="acc-billing-secondary" placeholder="e.g. 2" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" id="btn-cancel-modal" class="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900">Cancel</button>
            <button type="submit" id="btn-save-account" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow">Save Account</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// ---- Transactions View ----

function renderTransactionsView() {
  const pendingCount = transactionsList.filter(t => t.suggested_category_en).length;
  const uncategorizedCount = transactionsList.filter(t => !t.category_id && !t.suggested_category_en).length;
  const totalPages = Math.max(1, Math.ceil(txTotal / txLimit));
  const currentPage = txPage + 1;
  const hasActiveFilters = Boolean(txFilterAccountID || txFilterCategoryType || txFilterCategoryIDs.length > 0 || txFilterStartDate || txFilterEndDate || txFilterSearch);

  const uncategorizedCat = {
    id: 'UNCATEGORIZED',
    name_en: 'Uncategorized',
    name_he: 'ללא קטגוריה',
    color_hex: '#F59E0B',
    category_type: ''
  };

  const filteredCategories = txFilterCategoryType
    ? categoriesList.filter(c => c.category_type === txFilterCategoryType)
    : categoriesList;

  const availableCategories = [uncategorizedCat, ...filteredCategories];

  let subtitleHTML = `<span class="text-emerald-400 font-semibold">✓ All transactions categorized</span>`;
  if (pendingCount > 0) {
    subtitleHTML = `<span class="text-amber-400 font-semibold">⚠️ ${pendingCount} AI suggestions pending review</span>`;
  } else if (uncategorizedCount > 0) {
    subtitleHTML = `<span class="text-amber-400 font-semibold">⚠️ ${uncategorizedCount} uncategorized transactions (select category below or run LocalAI)</span>`;
  }

  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white">Transaction Ledger</h2>
          <p class="text-xs text-slate-400 mt-1">${subtitleHTML}</p>
        </div>
        <span class="text-xs text-slate-400">${txTotal} total transactions ${hasActiveFilters ? '(filtered)' : ''}</span>
      </div>

      <!-- Smart Filter Toolbar -->
      <div class="glass-panel p-4 space-y-3 relative z-30">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <!-- Account Filter -->
          <div>
            <label class="block text-[11px] font-medium text-slate-400 mb-1">Account</label>
            <select id="tx-filter-account" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500">
              <option value="">All Accounts</option>
              ${accountsList.map(a => `<option value="${a.id}" ${txFilterAccountID === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
            </select>
          </div>

          <!-- Category Type Filter -->
          <div>
            <label class="block text-[11px] font-medium text-slate-400 mb-1">Category Type</label>
            <select id="tx-filter-type" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500">
              <option value="" ${txFilterCategoryType === '' ? 'selected' : ''}>All Types</option>
              <option value="EXPENSE" ${txFilterCategoryType === 'EXPENSE' ? 'selected' : ''}>Expense</option>
              <option value="INCOME" ${txFilterCategoryType === 'INCOME' ? 'selected' : ''}>Income</option>
              <option value="TRANSFER" ${txFilterCategoryType === 'TRANSFER' ? 'selected' : ''}>Transfer</option>
            </select>
          </div>

          <!-- Category Subfilter (Multi-Select) -->
          <div class="relative">
            <label class="block text-[11px] font-medium text-slate-400 mb-1">
              Category Subfilter (${availableCategories.length})
            </label>
            <button id="btn-toggle-cat-dropdown" type="button" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 flex items-center justify-between">
              <span class="truncate">
                ${txFilterCategoryIDs.length === 0
                  ? 'All Categories'
                  : `${txFilterCategoryIDs.length} Selected`}
              </span>
              <span class="text-[10px] text-slate-400 ml-1">${isCatDropdownOpen ? '▲' : '▼'}</span>
            </button>

            <!-- Dropdown Panel -->
            <div id="tx-cat-dropdown-panel" class="${isCatDropdownOpen ? '' : 'hidden'} absolute top-full left-0 mt-1 z-50 w-72 max-w-[90vw] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-2.5 space-y-1.5 max-h-72 overflow-y-auto" style="z-index: 9999;">
              <div class="flex items-center justify-between px-1 border-b border-slate-800 pb-1.5">
                <span class="text-[10px] font-bold text-slate-400 uppercase">
                  ${txFilterCategoryType ? `${txFilterCategoryType}` : 'All'} Categories
                </span>
                <div class="flex items-center gap-2 text-[10px]">
                  <button id="btn-select-all-cats" type="button" class="text-brand-400 hover:underline">Select All</button>
                  <button id="btn-clear-all-cats" type="button" class="text-slate-400 hover:underline">Clear</button>
                </div>
              </div>

              ${availableCategories.length === 0 ? `
                <p class="text-xs text-slate-500 p-2 text-center">No categories found.</p>
              ` : availableCategories.map(c => {
                const isChecked = txFilterCategoryIDs.includes(c.id);
                return `
                  <label class="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800/60 cursor-pointer text-xs select-none ${c.id === 'UNCATEGORIZED' ? 'bg-amber-500/10 border-b border-slate-800 mb-1' : ''}">
                    <input type="checkbox" class="chk-category-filter rounded border-slate-700 text-brand-500 focus:ring-0" data-cat-id="${c.id}" ${isChecked ? 'checked' : ''} />
                    <span class="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style="background:${c.color_hex}"></span>
                    <span class="text-slate-200 font-medium truncate">${c.id === 'UNCATEGORIZED' ? '⚠️ Uncategorized' : c.name_en}</span>
                    ${c.name_he ? `<span class="text-slate-400 text-[11px] truncate">(${c.name_he})</span>` : ''}
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Date Range: From -->
          <div>
            <label class="block text-[11px] font-medium text-slate-400 mb-1">From Date</label>
            <input type="date" id="tx-filter-start" value="${txFilterStartDate}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500" />
          </div>

          <!-- Date Range: To -->
          <div>
            <label class="block text-[11px] font-medium text-slate-400 mb-1">To Date</label>
            <input type="date" id="tx-filter-end" value="${txFilterEndDate}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500" />
          </div>

          <!-- Search Input & Clear Button -->
          <div class="flex items-center gap-2">
            <div class="flex-1">
              <label class="block text-[11px] font-medium text-slate-400 mb-1">Search</label>
              <input type="text" id="tx-filter-search" value="${txFilterSearch}" placeholder="Payee or notes..." class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
            ${hasActiveFilters ? `
              <button id="btn-tx-clear-filters" title="Clear Filters" class="mt-5 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold transition">Clear</button>
            ` : ''}
          </div>
        </div>

        ${txFilterCategoryIDs.length > 0 ? `
          <div class="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-800/80">
            <span class="text-[11px] text-slate-400 font-medium mr-1">Active Category Filters (${txFilterCategoryIDs.length}):</span>
            ${txFilterCategoryIDs.map(id => {
              if (id === 'UNCATEGORIZED') {
                return `
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30 shadow-sm">
                    <span class="w-2 h-2 rounded-full inline-block bg-amber-400"></span>
                    <span>⚠️ Uncategorized (ללא קטגוריה)</span>
                    <button type="button" class="btn-remove-cat-filter text-amber-400 hover:text-rose-400 font-bold ml-1 transition" data-cat-id="UNCATEGORIZED">✕</button>
                  </span>
                `;
              }
              const cat = categoriesList.find(c => c.id === id);
              const name = cat ? `${cat.name_en} ${cat.name_he ? `(${cat.name_he})` : ''}` : id;
              const color = cat ? cat.color_hex : '#3B82F6';
              return `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 text-xs border border-slate-700 shadow-sm">
                  <span class="w-2 h-2 rounded-full inline-block" style="background:${color}"></span>
                  <span>${name}</span>
                  <button type="button" class="btn-remove-cat-filter text-slate-400 hover:text-rose-400 font-bold ml-1 transition" data-cat-id="${id}">✕</button>
                </span>
              `;
            }).join('')}
            <button id="btn-clear-cat-pills" type="button" class="text-[11px] text-rose-400 hover:underline ml-2">Clear Categories</button>
          </div>
        ` : ''}
      </div>

      <div class="glass-panel p-6">
        ${renderTransactionTableRows(transactionsList)}

        <!-- Pagination & Page Size Toolbar -->
        <div class="flex flex-wrap items-center justify-between mt-6 pt-4 border-t border-slate-800 gap-4">
          <div class="flex items-center gap-3">
            <span class="text-xs text-slate-400">Page ${currentPage} of ${totalPages} &bull; ${txTotal} total</span>
            <div class="flex items-center gap-1.5 pl-3 border-l border-slate-800 text-xs text-slate-400">
              <span>Per page:</span>
              <select id="tx-page-size" class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white">
                <option value="10" ${txLimit === 10 ? 'selected' : ''}>10</option>
                <option value="25" ${txLimit === 25 ? 'selected' : ''}>25</option>
                <option value="50" ${txLimit === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${txLimit === 100 ? 'selected' : ''}>100</option>
              </select>
            </div>
          </div>

          <div class="flex gap-2">
            <button id="btn-tx-prev" ${txPage === 0 ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg text-xs font-medium ${txPage === 0 ? 'text-slate-600 bg-slate-900/40 cursor-not-allowed' : 'text-slate-300 bg-slate-800 hover:bg-slate-700 transition'}">← Prev</button>
            <button id="btn-tx-next" ${currentPage >= totalPages ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg text-xs font-medium ${currentPage >= totalPages ? 'text-slate-600 bg-slate-900/40 cursor-not-allowed' : 'text-slate-300 bg-slate-800 hover:bg-slate-700 transition'}">Next →</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTransactionTableRows(txs: Transaction[]) {
  if (txs.length === 0) {
    return `<div class="py-12 text-center">
      <div class="text-3xl mb-3">📭</div>
      <p class="text-xs text-slate-500">No transactions recorded in database.</p>
    </div>`;
  }

  return `
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-900/80 text-slate-400 uppercase border-b border-slate-800">
          <tr>
            <th class="py-3 px-4">Date</th>
            <th class="py-3 px-4">Account</th>
            <th class="py-3 px-4">Payee / Merchant</th>
            <th class="py-3 px-4">Installment</th>
            <th class="py-3 px-4">Category / AI Suggestion</th>
            <th class="py-3 px-4 text-right">Amount</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60">
          ${txs.map(t => `
            <tr class="hover:bg-slate-900/40 transition">
              <td class="py-3 px-4 text-slate-300 whitespace-nowrap font-mono">${t.date}</td>
              <td class="py-3 px-4 text-slate-400">${t.account_name || 'Account'}</td>
              <td class="py-3 px-4 font-medium text-white">${t.payee_raw}</td>
              <td class="py-3 px-4 text-slate-400">
                ${t.current_installment && t.total_installments ? `<span class="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-mono">תשלום ${t.current_installment}/${t.total_installments}</span>` : '-'}
              </td>
              <td class="py-3 px-4">
                ${t.suggested_category_en ? `
                  <div class="glass-card p-3 border-amber-500/40 bg-amber-500/10 space-y-2">
                    <div class="flex items-center justify-between text-xs font-semibold text-amber-300">
                      <span>💡 AI Suggested:</span>
                      <span class="font-bold">${t.suggested_category_he} / ${t.suggested_category_en}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <button class="btn-accept-suggestion bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-xs font-semibold shadow" data-txid="${t.id}">
                        ✓ Accept
                      </button>
                      <button class="btn-reject-suggestion bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded text-xs" data-txid="${t.id}">
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ` : `
                  <select class="tx-cat-select bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer" data-txid="${t.id}">
                    <option value="" ${!t.category_id ? 'selected' : ''}>⚠️ Uncategorized</option>
                    ${categoriesList.map(c => `
                      <option value="${c.id}" ${t.category_id === c.id ? 'selected' : ''}>
                        ${c.name_en} (${c.name_he})
                      </option>
                    `).join('')}
                  </select>
                `}
              </td>
              <td class="py-3 px-4 text-right font-bold font-mono ${(t.amount ?? 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}">
                ${formatMoney(t.amount)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ---- Categories View ----

function renderCategoriesView() {
  const expenseCategories = categoriesList.filter(c => c.category_type === 'EXPENSE');
  const incomeCategories = categoriesList.filter(c => c.category_type === 'INCOME');
  const otherCategories = categoriesList.filter(c => c.category_type !== 'EXPENSE' && c.category_type !== 'INCOME');

  const renderCatGroup = (title: string, cats: Category[]) => {
    if (cats.length === 0) return '';
    return `
      <div class="space-y-3">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">${title}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${cats.map(c => `
            <div class="glass-card">
              <div class="flex items-center gap-3">
                <div class="w-3 h-3 rounded-full flex-shrink-0" style="background: ${c.color_hex || '#3B82F6'}"></div>
                <div class="flex-1 min-w-0">
                  <h4 class="text-sm font-bold text-white truncate">${c.name_en}</h4>
                  <span class="text-xs text-slate-400">${c.name_he}</span>
                </div>
              </div>
              ${c.monthly_budget ? `
                <div class="mt-2 text-xs text-slate-400">Budget: <span class="text-brand-400 font-mono">${formatMoney(c.monthly_budget)}/mo</span></div>
              ` : ''}
              <div class="mt-3 flex gap-2">
                <button class="btn-edit-cat flex-1 text-xs py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition" data-id="${c.id}">✏️ Edit</button>
                <button class="btn-delete-cat text-xs py-1 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition" data-id="${c.id}">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  return `
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white">Category Management</h2>
          <p class="text-xs text-slate-400 mt-1">${categoriesList.length} categories total</p>
        </div>
        <button id="btn-add-category" class="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-lg shadow-brand-500/20 transition">
          + Add Category
        </button>
      </div>

      ${categoriesList.length === 0 ? `
        <div class="glass-panel p-12 text-center space-y-3">
          <div class="text-4xl">🏷️</div>
          <p class="text-sm text-slate-400">No categories yet. Add your first category to start organizing transactions.</p>
          <button id="btn-add-category-empty" class="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow">
            + Add First Category
          </button>
        </div>
      ` : `
        ${renderCatGroup('Expense Categories', expenseCategories)}
        ${renderCatGroup('Income Categories', incomeCategories)}
        ${renderCatGroup('Other Categories', otherCategories)}
      `}
    </div>
  `;
}

// ---- Auto-Categorization View ----

function renderAutoCategorizationView() {
  const isRunning = categorizationStatus.running;
  const isCanceled = categorizationStatus.canceled;
  const total = categorizationStatus.total;
  const processed = categorizationStatus.processed;
  const currentBatch = categorizationStatus.current_batch;
  const totalBatches = categorizationStatus.total_batches;
  const batches = categorizationStatus.batches || [];
  const pendingBatchesCount = batches.filter(b => b.status === 'pending').length;

  const uncategorizedCount = transactionsList.filter(t => !t.category_id && !t.suggested_category_en).length;
  const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  return `
    <div class="space-y-8">
      <!-- Header Banner -->
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-6">
        <div>
          <h2 class="text-2xl font-extrabold text-white flex items-center gap-2">
            <span>✨ Auto-Categorization</span>
            ${isRunning ? `<span class="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">● Running</span>` : ''}
          </h2>
          <p class="text-xs text-slate-400 mt-1">
            Automated transaction categorization using AI LLM micro-batches.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right text-xs">
            <span class="text-slate-400 block">Waiting in DB</span>
            <span class="text-white font-bold font-mono text-sm">${uncategorizedCount} transactions</span>
          </div>
        </div>
      </div>

      <!-- Main Layout Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left Column: Status & Run Controls (2 cols on LG) -->
        <div class="lg:col-span-2 space-y-6">

          <!-- RUN STATUS CARD -->
          <div class="glass-panel p-6 space-y-6 ${!isRunning ? 'bg-slate-900/40 border-slate-800/60' : 'border-brand-500/30'}">
            
            ${isRunning ? `
              <!-- RUNNING STATE -->
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-base font-bold text-white flex items-center gap-2">
                      <span class="w-3 h-3 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                      Categorization Run Active
                    </h3>
                    <p class="text-xs text-slate-400 mt-0.5">
                      Batch ${currentBatch} of ${totalBatches} in progress (${pendingBatchesCount} pending)
                    </p>
                  </div>
                  <button id="btn-cancel-autocat" class="bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow transition flex items-center gap-1.5">
                    <span>⛔ Cancel Categorization Run</span>
                  </button>
                </div>

                <!-- Progress Bar -->
                <div class="space-y-1.5">
                  <div class="flex justify-between text-xs font-medium">
                    <span class="text-slate-300">Overall Progress: ${processed} / ${total} transactions</span>
                    <span class="text-brand-400 font-bold font-mono">${pct}%</span>
                  </div>
                  <div class="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                    <div class="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                  </div>
                </div>
              </div>
            ` : `
              <!-- IDLE / NOT RUNNING STATE (GREYED OUT STATUS) -->
              <div class="space-y-6">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div>
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                      <span>🚀 Ready to Run Auto-Categorization</span>
                    </h3>
                    <p class="text-xs text-slate-400 mt-1">
                      ${uncategorizedCount > 0 
                        ? `${uncategorizedCount} transactions ready for AI categorization.`
                        : 'All transactions have been categorized and reviewed.'}
                    </p>
                  </div>
                  <button id="btn-start-autocat" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg shadow-purple-500/25 transition flex items-center justify-center gap-2 flex-shrink-0">
                    <span>✨ Run Categorization</span>
                  </button>
                </div>

                ${isCanceled ? `
                  <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                    <span>⚠️ Previous categorization run was canceled by user (${processed}/${total} processed).</span>
                  </div>
                ` : ''}

                ${categorizationStatus.last_error ? `
                  <div class="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    ❌ ${categorizationStatus.last_error}
                  </div>
                ` : ''}
              </div>
            `}

            <!-- BATCHES STATUS LIST & RESULTS BUTTONS -->
            <div class="space-y-3 pt-4 border-t border-slate-800/80 ${!isRunning ? 'opacity-75' : ''}">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Batches Status (${batches.length} Micro-Batches)
                </h4>
                <span class="text-[11px] text-slate-500">${pendingBatchesCount} pending &bull; ${batches.filter(b => b.status === 'completed').length} completed</span>
              </div>

              ${batches.length === 0 ? `
                <p class="text-xs text-slate-500 py-4 text-center">No active or previous batch run history.</p>
              ` : `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  ${batches.map(b => {
                    let badgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
                    let statusLabel = 'Pending';
                    if (b.status === 'running') {
                      badgeClass = 'bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse';
                      statusLabel = '⚡ Running';
                    } else if (b.status === 'completed') {
                      badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                      statusLabel = '✓ Completed';
                    } else if (b.status === 'failed' || b.status === 'skipped') {
                      badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                      statusLabel = `✕ ${b.status}`;
                    } else if (b.status === 'canceled') {
                      badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                      statusLabel = '⛔ Canceled';
                    }

                    return `
                      <div class="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-white">Batch #${b.index}</span>
                            <span class="text-[10px] px-2 py-0.5 rounded-full border ${badgeClass}">
                              ${statusLabel}
                            </span>
                          </div>
                          <span class="text-[11px] text-slate-400 mt-0.5 block">${b.tx_count} transactions</span>
                        </div>
                        ${b.status === 'completed' && b.results && b.results.length > 0 ? `
                          <button class="btn-view-batch-results text-[11px] px-2.5 py-1 rounded bg-brand-600/80 hover:bg-brand-500 text-white font-medium transition" data-batch-idx="${b.index - 1}">
                            🔍 View Results
                          </button>
                        ` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>

          </div>
        </div>

        <!-- Right Column: System Prompt & Parameters -->
        <div class="space-y-6">
          
          <!-- SYSTEM PROMPT EDITOR CARD -->
          <div class="glass-panel p-6 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-white">System Prompt Parameters</h3>
              <button id="btn-reset-prompt" class="text-[11px] text-slate-400 hover:text-amber-300 transition underline">
                🔄 Reset to Default
              </button>
            </div>
            <p class="text-xs text-slate-400">
              Customize the instructions delivered to the AI for transaction matching and category generation.
            </p>

            <textarea id="autocat-prompt-input" rows="12" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-500 leading-relaxed">${autoCatPrompt}</textarea>

            <button id="btn-save-prompt" class="w-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-2.5 rounded-lg shadow transition">
              💾 Save Prompt Parameters
            </button>
          </div>

          <!-- CONNECTION PREVIEW CARD -->
          <div class="glass-panel p-6 space-y-3">
            <h3 class="text-sm font-bold text-white">LLM Provider Config</h3>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400">Endpoint URL</span>
                <span class="text-slate-200 font-mono truncate max-w-[180px]">${settingsData['localai_url'] || 'http://localhost:8080'}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400">Model Name</span>
                <span class="text-slate-200 font-mono">${settingsData['localai_model'] || 'llama-3-8b'}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400">Batch Size</span>
                <span class="text-slate-200 font-mono">${settingsData['localai_batch_size'] || '5'} tx / batch</span>
              </div>
            </div>
            <button id="btn-nav-settings" class="w-full text-center text-xs text-brand-400 hover:text-brand-300 font-medium py-1 transition">
              ⚙️ Change LLM Settings in Settings Tab →
            </button>
          </div>

        </div>

      </div>
    </div>
  `;
}

function renderBatchResultsModal() {
  if (!selectedBatchResults) return '';
  return `
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div class="glass-panel max-w-3xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto border border-slate-700 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <span>🔍 Batch #${selectedBatchResults.index} Results</span>
            <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
              ${selectedBatchResults.tx_count} Transactions
            </span>
          </h3>
          <button id="btn-close-batch-modal" class="text-slate-400 hover:text-white text-lg font-bold px-2 py-0.5 rounded hover:bg-slate-800 transition">✕</button>
        </div>

        <div class="space-y-3">
          ${(selectedBatchResults.results || []).map(r => {
            const tx = transactionsList.find(t => t.id === r.transaction_id);
            const payee = r.payee_raw || (tx ? tx.payee_raw : 'Transaction Item');
            const amt = r.amount !== undefined ? r.amount : (tx ? tx.amount : 0);
            const date = r.date || (tx ? tx.date : '');

            let catDisplay = '';
            if (r.category_name_en || r.category_name_he) {
              const catObj = categoriesList.find(c => c.id === r.category_id);
              const color = catObj ? catObj.color_hex : '#3B82F6';
              catDisplay = `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
                  <span class="w-2 h-2 rounded-full inline-block" style="background:${color}"></span>
                  ${r.category_name_en || r.category_name_he} ${r.category_name_he && r.category_name_en ? `(${r.category_name_he})` : ''}
                </span>
              `;
            } else if (r.category_id) {
              const catObj = categoriesList.find(c => c.id === r.category_id);
              if (catObj) {
                catDisplay = `
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
                    <span class="w-2 h-2 rounded-full inline-block" style="background:${catObj.color_hex}"></span>
                    ${catObj.name_en} ${catObj.name_he ? `(${catObj.name_he})` : ''}
                  </span>
                `;
              } else {
                catDisplay = `<span class="px-2.5 py-1 rounded-md bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">${r.category_id}</span>`;
              }
            } else if (r.suggested_category) {
              catDisplay = `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  Suggested: ${r.suggested_category.name_en || r.suggested_category.name_he} ${r.suggested_category.name_he && r.suggested_category.name_en ? `(${r.suggested_category.name_he})` : ''} [${r.suggested_category.category_type}]
                </span>
              `;
            } else {
              catDisplay = `<span class="text-slate-500">Uncategorized</span>`;
            }

            return `
              <div class="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                <div class="flex justify-between items-center font-medium">
                  <span class="text-white font-bold text-sm">${payee}</span>
                  <span class="text-slate-300 font-mono text-xs">${formatMoney(amt)} &bull; ${date}</span>
                </div>
                <div class="flex justify-between items-center text-xs pt-2 border-t border-slate-800/60">
                  <div class="flex items-center gap-2">
                    <span class="text-slate-400 font-medium">Chosen Category:</span>
                    ${catDisplay}
                  </div>
                  ${r.confidence ? `<span class="text-slate-400 text-[11px]">Confidence: ${(r.confidence * 100).toFixed(0)}%</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderCategoryModal() {
  const cat = editingCategory;
  const isEdit = cat !== null;
  return `
    <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="glass-panel max-w-md w-full p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-lg font-bold text-white">${isEdit ? 'Edit Category' : 'Add Category'}</h3>
          <button id="btn-close-cat-modal" class="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        <form id="form-category" class="space-y-4">
          <div id="cat-modal-error" class="hidden p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium"></div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Name (English)</label>
              <input type="text" id="cat-name-en" required value="${cat?.name_en || ''}" placeholder="e.g. Groceries" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Name (Hebrew)</label>
              <input type="text" id="cat-name-he" value="${cat?.name_he || ''}" placeholder="e.g. מכולת" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" dir="rtl" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Category Type</label>
              <select id="cat-type" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                <option value="EXPENSE" ${cat?.category_type === 'EXPENSE' ? 'selected' : ''}>EXPENSE</option>
                <option value="INCOME" ${cat?.category_type === 'INCOME' ? 'selected' : ''}>INCOME</option>
                <option value="TRANSFER" ${cat?.category_type === 'TRANSFER' ? 'selected' : ''}>TRANSFER</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Monthly Budget (₪)</label>
              <input type="number" step="0.01" id="cat-budget" value="${cat?.monthly_budget ?? ''}" placeholder="0.00 (optional)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Color</label>
              <input type="color" id="cat-color" value="${cat?.color_hex || '#3B82F6'}" class="w-full h-9 bg-slate-900 border border-slate-700 rounded-lg px-1 cursor-pointer" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Icon (emoji or text)</label>
              <input type="text" id="cat-icon" value="${cat?.icon || 'tag'}" placeholder="tag" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" id="btn-cancel-cat-modal" class="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900">Cancel</button>
            <button type="submit" id="btn-save-category" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow">
              ${isEdit ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// ---- Import Wizard State ----

let wizardStep = 0; // 0, 1, 3, 4, 5
let wizardAccountID = '';
let wizardFile: File | null = null;
let wizardInspectResult: { columns: string[]; sample_rows: string[][]; total_rows: number } | null = null;
let wizardMapping = {
  date_col: '',
  payee_col: '',
  payee_col_2: '',
  amount_mode: 'amount', // 'amount' | 'debit_credit'
  amount_col: '',
  debit_col: '',
  credit_col: '',
  billing_date_col: '',
  original_amount_col: '',
  original_currency_col: '',
};
let wizardStagingResult: {
  passed_transactions: Transaction[];
  failed_rows: { row_index: number; raw_row: string[]; reason: string }[];
  passed_count: number;
  failed_count: number;
  duplicate_count: number;
} | null = null;
let wizardCommitResult: {
  imported: number;
  duplicates: number;
  total: number;
  duplicate_records?: Array<{
    date: string;
    payee_raw: string;
    amount: number;
    currency: string;
    original_amount?: number;
    import_hash: string;
    reason: string;
  }>;
} | null = null;

function renderImportView() {
  const steps = [
    { num: 0, label: '0. Account & File' },
    { num: 1, label: '1-2. Columns & Mapping' },
    { num: 3, label: '3. Preview' },
    { num: 4, label: '4. Staging Validation' },
    { num: 5, label: '5. Finish' },
  ];

  return `
    <div class="max-w-4xl mx-auto glass-panel p-8 space-y-6">
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 class="text-2xl font-bold text-white">Statement CSV Import Wizard</h2>
          <p class="text-xs text-slate-400 mt-1">Multi-step interactive parser with auto-encoding (UTF-8 / Windows-1255) &amp; validation</p>
        </div>
        <button id="btn-reset-wizard" class="text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition">
          🔄 Reset Wizard
        </button>
      </div>

      <!-- Stepper Progress Indicator -->
      <div class="grid grid-cols-5 gap-2 border-b border-slate-800 pb-4">
        ${steps.map(s => {
          const isCurrent = wizardStep === s.num;
          const isDone = wizardStep > s.num;
          return `
            <div class="flex flex-col items-center gap-1">
              <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isCurrent ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30 ring-2 ring-brand-400' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-500 border border-slate-800'}">
                ${isDone ? '✓' : s.num}
              </div>
              <span class="text-[10px] font-medium text-center ${isCurrent ? 'text-brand-400 font-bold' : isDone ? 'text-emerald-400' : 'text-slate-500'}">
                ${s.label}
              </span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- STEP 0: Select Account & File -->
      ${wizardStep === 0 ? `
        <div class="space-y-6">
          ${accountsList.length === 0 ? `
            <div class="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
              ⚠️ No accounts registered yet. Please add at least one account in the Accounts tab before importing statements.
            </div>
          ` : ''}

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Target Account</label>
              <select id="w0-account-id" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500">
                ${accountsList.map(a => `<option value="${a.id}" ${wizardAccountID === a.id ? 'selected' : ''}>${a.name} (${a.institution} - ${a.account_type})</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Select Bank or Credit Card CSV File</label>
              <input type="file" id="w0-file" accept=".csv" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500 cursor-pointer" />
            </div>
          </div>

          <div class="flex justify-end pt-4 border-t border-slate-800">
            <button id="btn-w0-next" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2.5 rounded-lg text-xs shadow-lg shadow-brand-500/20 transition flex items-center gap-2">
              <span>Step 1: Inspect Columns &amp; Load Preview →</span>
            </button>
          </div>
        </div>
      ` : ''}

      <!-- STEP 1 & 2: Show First 10 Lines & Column Mapping -->
      ${wizardStep === 1 && wizardInspectResult ? `
        <div class="space-y-6">
          <div class="p-4 rounded-lg bg-brand-500/10 border border-brand-500/20 space-y-2">
            <h3 class="text-xs font-bold text-brand-300">Found ${wizardInspectResult.columns.length} columns &amp; ${wizardInspectResult.total_rows} total rows in CSV</h3>
            <div class="flex flex-wrap gap-1.5">
              ${wizardInspectResult.columns.map(c => `<span class="px-2 py-0.5 rounded-md bg-slate-900 text-slate-200 border border-slate-700 text-[11px] font-mono">${c}</span>`).join('')}
            </div>
          </div>

          <!-- Sample 10 Rows Table -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-slate-300">First 10 Raw CSV Lines Preview</h4>
            <div class="overflow-x-auto border border-slate-800 rounded-lg max-h-56">
              <table class="w-full text-left text-[11px] font-mono">
                <thead class="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th class="py-2 px-3 text-slate-500">#</th>
                    ${wizardInspectResult.columns.map(c => `<th class="py-2 px-3 whitespace-nowrap">${c}</th>`).join('')}
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/40">
                  ${wizardInspectResult.sample_rows.map((row, idx) => `
                    <tr class="hover:bg-slate-900/50">
                      <td class="py-1.5 px-3 text-slate-500 font-bold">${idx + 1}</td>
                      ${row.map(cell => `<td class="py-1.5 px-3 whitespace-nowrap text-slate-300">${cell || '-'}</td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Column Mapping Form -->
          <div class="space-y-4 pt-4 border-t border-slate-800">
            <h4 class="text-xs font-bold text-white uppercase tracking-wider">Map Required CSV Columns</h4>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Date Column *</label>
                <select id="w1-date-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  ${wizardInspectResult.columns.map(c => `
                    <option value="${c}" ${wizardMapping.date_col === c ? 'selected' : ''}>${c}</option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Primary Description / Payee Column *</label>
                <select id="w1-payee-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  ${wizardInspectResult.columns.map(c => `
                    <option value="${c}" ${wizardMapping.payee_col === c ? 'selected' : ''}>${c}</option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Secondary Column (Optional - Concatenated)</label>
                <select id="w1-payee-col-2" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  <option value="">(None - Single Column)</option>
                  ${wizardInspectResult.columns.map(c => `
                    <option value="${c}" ${wizardMapping.payee_col_2 === c ? 'selected' : ''}>${c}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-semibold text-slate-300">Amount Structure</label>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="radio" name="w1-mode" value="amount" ${wizardMapping.amount_mode === 'amount' ? 'checked' : ''} id="radio-mode-single" />
                  <span>Single Signed Amount Column (e.g. סכום)</span>
                </label>
                <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="radio" name="w1-mode" value="debit_credit" ${wizardMapping.amount_mode === 'debit_credit' ? 'checked' : ''} id="radio-mode-split" />
                  <span>Separate Debit &amp; Credit Columns (e.g. חיוב / זיכוי)</span>
                </label>
              </div>
            </div>

            <div id="w1-single-amount-block" class="${wizardMapping.amount_mode === 'amount' ? '' : 'hidden'}">
              <label class="block text-xs font-semibold text-slate-300 mb-1">Amount Column</label>
              <select id="w1-amount-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                ${wizardInspectResult.columns.map(c => `
                  <option value="${c}" ${wizardMapping.amount_col === c ? 'selected' : ''}>${c}</option>
                `).join('')}
              </select>
            </div>

            <div id="w1-split-amount-block" class="grid grid-cols-2 gap-4 ${wizardMapping.amount_mode === 'debit_credit' ? '' : 'hidden'}">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Debit Column (Expense)</label>
                <select id="w1-debit-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  ${wizardInspectResult.columns.map(c => `
                    <option value="${c}" ${wizardMapping.debit_col === c ? 'selected' : ''}>${c}</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Credit Column (Income)</label>
                <select id="w1-credit-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  ${wizardInspectResult.columns.map(c => `
                    <option value="${c}" ${wizardMapping.credit_col === c ? 'selected' : ''}>${c}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <!-- Optional Credit Card Specific Mappings -->
            <div class="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
              <h5 class="text-[11px] font-bold text-brand-300 uppercase tracking-wider">Credit Card Statement Fields (Optional)</h5>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="block text-[11px] font-medium text-slate-400 mb-1">Billing Date Column</label>
                  <select id="w1-billing-date-col" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white">
                    <option value="">(None - Default to cycle day)</option>
                    ${wizardInspectResult.columns.map(c => `
                      <option value="${c}" ${wizardMapping.billing_date_col === c ? 'selected' : ''}>${c}</option>
                    `).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-slate-400 mb-1">Original Amount Column</label>
                  <select id="w1-orig-amount-col" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white">
                    <option value="">(None)</option>
                    ${wizardInspectResult.columns.map(c => `
                      <option value="${c}" ${wizardMapping.original_amount_col === c ? 'selected' : ''}>${c}</option>
                    `).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-slate-400 mb-1">Original Currency Column</label>
                  <select id="w1-orig-currency-col" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white">
                    <option value="">(None)</option>
                    ${wizardInspectResult.columns.map(c => `
                      <option value="${c}" ${wizardMapping.original_currency_col === c ? 'selected' : ''}>${c}</option>
                    `).join('')}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-slate-800">
            <button id="btn-w1-back" class="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900">
              ← Back to Step 0
            </button>
            <button id="btn-w1-next" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2.5 rounded-lg text-xs shadow-lg shadow-brand-500/20 transition">
              Step 3: Preview Transactions Mapping →
            </button>
          </div>
        </div>
      ` : ''}

      <!-- STEP 3: Preview Mapped Transactions -->
      ${wizardStep === 3 && wizardStagingResult ? `
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">Mapping Preview (${wizardStagingResult.passed_count} transactions parsed)</h3>
            <span class="text-xs text-emerald-400 font-semibold">✓ Parsed successfully</span>
          </div>

          <div class="overflow-x-auto border border-slate-800 rounded-lg max-h-80">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                <tr>
                  <th class="py-2.5 px-3">Date</th>
                  <th class="py-2.5 px-3">Payee / Merchant</th>
                  <th class="py-2.5 px-3">Installment</th>
                  <th class="py-2.5 px-3 text-right">Parsed Amount</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/40">
                ${wizardStagingResult.passed_transactions.slice(0, 15).map(t => `
                  <tr class="hover:bg-slate-900/50">
                    <td class="py-2 px-3 text-slate-300 font-mono">${t.date}</td>
                    <td class="py-2 px-3 font-medium text-white">${t.payee_raw}</td>
                    <td class="py-2 px-3 text-slate-400">
                      ${t.current_installment && t.total_installments ? `<span class="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">תשלום ${t.current_installment}/${t.total_installments}</span>` : '-'}
                    </td>
                    <td class="py-2 px-3 text-right font-bold font-mono ${t.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}">
                      ${formatMoney(t.amount)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${wizardStagingResult.passed_count > 15 ? `<p class="text-xs text-slate-500 text-center">+ ${wizardStagingResult.passed_count - 15} more parsed transactions</p>` : ''}

          <div class="flex items-center justify-between pt-4 border-t border-slate-800">
            <button id="btn-w3-back" class="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900">
              ← Edit Column Mapping
            </button>
            <button id="btn-w3-next" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2.5 rounded-lg text-xs shadow-lg shadow-brand-500/20 transition">
              Step 4: Run Staging Validation →
            </button>
          </div>
        </div>
      ` : ''}

      <!-- STEP 4: Staging Area Breakdown -->
      ${wizardStep === 4 && wizardStagingResult ? `
        <div class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span class="text-xs text-slate-400 uppercase font-semibold">Passed Transactions</span>
              <h3 class="text-2xl font-extrabold text-emerald-400 mt-1">${wizardStagingResult.passed_count}</h3>
              <p class="text-[11px] text-emerald-300/80 mt-1">Ready to be saved to database</p>
            </div>
            <div class="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <span class="text-xs text-slate-400 uppercase font-semibold">Failed / Skipped Rows</span>
              <h3 class="text-2xl font-extrabold text-rose-400 mt-1">${wizardStagingResult.failed_count}</h3>
              <p class="text-[11px] text-rose-300/80 mt-1">Invalid dates, 0 amounts, or formatting errors</p>
            </div>
          </div>

          <!-- Failed Rows Section -->
          ${wizardStagingResult.failed_count > 0 ? `
            <div class="space-y-2">
              <h4 class="text-xs font-bold text-rose-400 flex items-center gap-2">
                <span>⚠️ Failed Rows Breakdown (${wizardStagingResult.failed_count})</span>
              </h4>
              <div class="overflow-x-auto border border-rose-500/20 rounded-lg max-h-48">
                <table class="w-full text-left text-[11px]">
                  <thead class="bg-rose-950/40 text-rose-300 border-b border-rose-500/20">
                    <tr>
                      <th class="py-2 px-3">Row #</th>
                      <th class="py-2 px-3">Reason</th>
                      <th class="py-2 px-3">Raw Content</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-rose-500/10">
                    ${wizardStagingResult.failed_rows.map(f => `
                      <tr class="hover:bg-rose-500/5">
                        <td class="py-1.5 px-3 font-bold text-slate-400 font-mono">${f.row_index}</td>
                        <td class="py-1.5 px-3 font-semibold text-rose-400 whitespace-nowrap">${f.reason}</td>
                        <td class="py-1.5 px-3 text-slate-400 font-mono truncate max-w-xs">${f.raw_row.join(' | ')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}

          <!-- Passed Transactions Section -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-emerald-400">Approved Transactions to Import (${wizardStagingResult.passed_count})</h4>
            <div class="overflow-x-auto border border-slate-800 rounded-lg max-h-60">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th class="py-2 px-3">Date</th>
                    <th class="py-2 px-3">Payee</th>
                    <th class="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/40">
                  ${wizardStagingResult.passed_transactions.map(t => `
                    <tr class="hover:bg-slate-900/40">
                      <td class="py-1.5 px-3 text-slate-300 font-mono">${t.date}</td>
                      <td class="py-1.5 px-3 font-medium text-white">${t.payee_raw}</td>
                      <td class="py-1.5 px-3 text-right font-bold font-mono ${t.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}">${formatMoney(t.amount)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-slate-800">
            <button id="btn-w4-back" class="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900">
              ← Edit Mapping
            </button>
            <button id="btn-w4-commit" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-lg text-xs shadow-lg shadow-emerald-500/20 transition flex items-center gap-2">
              <span>Approve &amp; Import ${wizardStagingResult.passed_count} Transactions 🚀</span>
            </button>
          </div>
        </div>
      ` : ''}

      <!-- STEP 5: Finished -->
      ${wizardStep === 5 && wizardCommitResult ? `
        <div class="text-center py-8 space-y-6">
          <div class="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto text-emerald-400">
            ✓
          </div>
          <div>
            <h3 class="text-2xl font-extrabold text-white">Import Complete!</h3>
            <p class="text-xs text-slate-400 mt-2">
              Successfully added <span class="text-emerald-400 font-bold">${wizardCommitResult.imported}</span> transactions to the database.
              ${wizardCommitResult.duplicates > 0 ? `<span class="text-amber-400 font-bold">(${wizardCommitResult.duplicates} duplicate records skipped)</span>` : ''}
            </p>
          </div>

          ${wizardCommitResult.duplicate_records && wizardCommitResult.duplicate_records.length > 0 ? `
            <div class="mt-4 text-left bg-slate-900/80 rounded-xl p-4 border border-amber-500/30 max-w-3xl mx-auto space-y-3 shadow-lg">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span>⚠️ Skipped Duplicate Records (${wizardCommitResult.duplicate_records.length})</span>
                </span>
                <span class="text-[10px] text-slate-400">Unique Identity: Account + Date + Amount + Payee</span>
              </div>
              <div class="max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950">
                <table class="w-full text-[11px] text-left text-slate-300">
                  <thead class="bg-slate-900 text-slate-400 font-semibold sticky top-0 border-b border-slate-800">
                    <tr>
                      <th class="py-2 px-3">Date</th>
                      <th class="py-2 px-3">Payee / Description</th>
                      <th class="py-2 px-3 text-right">Amount</th>
                      <th class="py-2 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/50">
                    ${wizardCommitResult.duplicate_records.map(dup => `
                      <tr class="hover:bg-slate-900/50 transition-colors">
                        <td class="py-2 px-3 whitespace-nowrap text-slate-400 font-mono">${dup.date}</td>
                        <td class="py-2 px-3 font-medium text-slate-200">${dup.payee_raw}</td>
                        <td class="py-2 px-3 text-right font-mono text-amber-300 whitespace-nowrap">
                          ${dup.amount.toFixed(2)} ${dup.currency}
                          ${dup.original_amount !== undefined && dup.original_amount !== null && dup.original_amount !== dup.amount ? `<div class="text-[10px] text-slate-500">Orig: ${dup.original_amount.toFixed(2)}</div>` : ''}
                        </td>
                        <td class="py-2 px-3 text-slate-400 whitespace-nowrap">${dup.reason}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}

          <div class="flex justify-center gap-4 pt-4 border-t border-slate-800">
            <button id="btn-w5-view-txs" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2.5 rounded-lg text-xs shadow">
              View Transactions Ledger 💳
            </button>
            <button id="btn-w5-again" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-2.5 rounded-lg text-xs font-medium">
              Import Another CSV File 📤
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ---- Billing Cycles View ----

function renderBillingCyclesView() {
  const ccAccounts = accountsList.filter(a => a.account_type === 'CREDIT_CARD');

  return `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-white">🔗 Credit Card Billing Cycles</h2>
          <p class="text-xs text-slate-400 mt-1">Group credit card transactions into billing cycles, monitor expected billing amounts, and match bank payments.</p>
        </div>
        <button id="btn-open-generate-modal" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-lg shadow-brand-500/20 transition flex items-center gap-1.5 self-start sm:self-auto">
          <span>⚡ Generate Billing Cycles</span>
        </button>
      </div>

      <!-- Filters & Stats Bar -->
      <div class="glass-panel p-4 flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <div>
            <label class="block text-[10px] font-semibold text-slate-400 mb-0.5">Credit Card Account</label>
            <select id="cycle-account-filter" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white">
              <option value="">All CC Accounts</option>
              ${ccAccounts.map(a => `<option value="${a.id}" ${selectedCycleAccountID === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-slate-400 mb-0.5">Status Filter</label>
            <select id="cycle-status-filter" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white">
              <option value="">All Statuses</option>
              <option value="OPEN" ${selectedCycleStatusFilter === 'OPEN' ? 'selected' : ''}>OPEN</option>
              <option value="BILLED" ${selectedCycleStatusFilter === 'BILLED' ? 'selected' : ''}>BILLED</option>
              <option value="PAID" ${selectedCycleStatusFilter === 'PAID' ? 'selected' : ''}>PAID</option>
              <option value="PARTIAL" ${selectedCycleStatusFilter === 'PARTIAL' ? 'selected' : ''}>PARTIAL</option>
            </select>
          </div>
        </div>

        <div class="text-xs text-slate-400">
          Showing <span class="font-bold text-white">${billingCyclesList.length}</span> billing cycles
        </div>
      </div>

      <!-- Cycles Table -->
      <div class="glass-panel overflow-hidden">
        ${billingCyclesList.length === 0 ? `
          <div class="p-8 text-center space-y-3">
            <div class="text-3xl">🗓️</div>
            <p class="text-xs text-slate-400">No billing cycles found. Click <strong>"Generate Billing Cycles"</strong> above to auto-create monthly billing cycles for your credit card accounts.</p>
          </div>
        ` : `
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th class="py-3 px-4">Account</th>
                  <th class="py-3 px-4">Billing Day</th>
                  <th class="py-3 px-4">Cycle Period</th>
                  <th class="py-3 px-4">Expected Bill Date</th>
                  <th class="py-3 px-4 text-right">Expected Amount</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/40">
                ${billingCyclesList.map(c => {
                  let statusBadge = '';
                  if (c.status === 'PAID') {
                    statusBadge = `<span class="px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">✓ PAID</span>`;
                  } else if (c.status === 'PARTIAL') {
                    statusBadge = `<span class="px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">⚠ PARTIAL</span>`;
                  } else if (c.status === 'BILLED') {
                    statusBadge = `<span class="px-2 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-bold">BILLED</span>`;
                  } else {
                    statusBadge = `<span class="px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-medium">OPEN</span>`;
                  }

                  return `
                    <tr class="hover:bg-slate-900/50 transition">
                      <td class="py-3 px-4 font-bold text-white">${c.account_name || c.account_id}</td>
                      <td class="py-3 px-4 text-slate-400 font-mono">Day ${c.billing_day}</td>
                      <td class="py-3 px-4 text-slate-300 font-mono">${c.cycle_start_date} → ${c.cycle_end_date}</td>
                      <td class="py-3 px-4 text-slate-300 font-mono">${c.expected_bill_date}</td>
                      <td class="py-3 px-4 text-right font-bold font-mono text-rose-400">${formatMoney(c.expected_amount)}</td>
                      <td class="py-3 px-4">${statusBadge}</td>
                      <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          <button class="btn-view-cycle bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md text-[11px] font-medium transition" data-id="${c.id}">
                            🔍 Detail
                          </button>
                          ${c.status === 'PAID' || c.status === 'PARTIAL' ? `
                            <button class="btn-unlink-cycle bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-md text-[11px] font-medium transition" data-id="${c.id}">
                              ❌ Unlink
                            </button>
                          ` : `
                            <button class="btn-reconcile-cycle bg-brand-600 hover:bg-brand-500 text-white px-2.5 py-1 rounded-md text-[11px] font-bold shadow transition" data-id="${c.id}">
                              🔗 Match Payment
                            </button>
                          `}
                          <button class="btn-delete-cycle text-slate-500 hover:text-rose-400 px-1.5 py-1 rounded transition" data-id="${c.id}">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>

    ${showGenerateCyclesModal ? renderGenerateCyclesModal() : ''}
    ${activeCycleDetail ? renderCycleDetailModal() : ''}
  `;
}

function renderGenerateCyclesModal() {
  const ccAccounts = accountsList.filter(a => a.account_type === 'CREDIT_CARD');
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return `
    <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="glass-panel max-w-md w-full p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-lg font-bold text-white">⚡ Generate Billing Cycles</h3>
          <button id="btn-close-generate-modal" class="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        <form id="form-generate-cycles" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Target Credit Card Account</label>
            <select id="gen-account-id" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
              ${ccAccounts.map(a => `<option value="${a.id}">${a.name} (${a.institution})</option>`).join('')}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">From Month</label>
              <input type="month" id="gen-from-month" value="${currentMonthStr}" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">To Month</label>
              <input type="month" id="gen-to-month" value="${currentMonthStr}" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
          </div>

          <div class="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p class="font-bold text-slate-300">💡 Israeli Weekday Rule</p>
            <p>If expected bill date lands on Friday or Saturday, it auto-adjusts forward to Sunday.</p>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" id="btn-cancel-generate-modal" class="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900">Cancel</button>
            <button type="submit" id="btn-submit-generate" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow">Generate Cycles</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderCycleDetailModal() {
  if (!activeCycleDetail) return '';
  const { billing_cycle: cycle, transactions: txs } = activeCycleDetail;

  return `
    <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="glass-panel max-w-4xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 class="text-lg font-bold text-white">Billing Cycle Detail: ${cycle.account_name || cycle.account_id}</h3>
            <p class="text-xs text-slate-400 mt-0.5">
              Period: <span class="font-mono text-slate-200">${cycle.cycle_start_date} → ${cycle.cycle_end_date}</span> &bull; Expected Bill Date: <span class="font-mono text-brand-400 font-bold">${cycle.expected_bill_date}</span>
            </p>
          </div>
          <button id="btn-close-cycle-detail" class="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        <!-- Summary & Auto-Populate -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span class="text-xs text-slate-400">Assigned Transactions</span>
            <div class="text-2xl font-bold text-white">${txs.length}</div>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span class="text-xs text-slate-400">Total Billed Amount</span>
            <div class="text-2xl font-extrabold text-rose-400 font-mono">${formatMoney(cycle.expected_amount)}</div>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span class="text-xs text-slate-400">Auto-Assign Transactions</span>
              <p class="text-[10px] text-slate-500 mt-0.5">Assign CC transactions matching this billing window</p>
            </div>
            <button id="btn-auto-populate-cycle" data-id="${cycle.id}" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow transition">
              ⚡ Auto-Populate
            </button>
          </div>
        </div>

        <!-- Transactions Table -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold text-slate-300">Cycle Transactions</h4>
          <div class="overflow-x-auto border border-slate-800 rounded-lg max-h-60">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                <tr>
                  <th class="py-2.5 px-3">Tx Date</th>
                  <th class="py-2.5 px-3">Billing Date</th>
                  <th class="py-2.5 px-3">Payee / Merchant</th>
                  <th class="py-2.5 px-3 text-right">Billed Amount (ILS)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/40">
                ${txs.length === 0 ? `
                  <tr><td colspan="4" class="py-4 text-center text-xs text-slate-500">No transactions assigned to this billing cycle yet. Click "Auto-Populate" above.</td></tr>
                ` : txs.map(t => `
                  <tr class="hover:bg-slate-900/40">
                    <td class="py-2 px-3 text-slate-300 font-mono">${t.date}</td>
                    <td class="py-2 px-3 text-slate-400 font-mono">${t.billing_date || '-'}</td>
                    <td class="py-2 px-3 font-medium text-white">${t.payee_raw}</td>
                    <td class="py-2 px-3 text-right font-bold font-mono text-rose-400">${formatMoney(t.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Bank Payment Candidate Section -->
        <div class="space-y-3 border-t border-slate-800 pt-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-xs font-bold text-white">Bank Payment Reconciliation</h4>
              <p class="text-[11px] text-slate-400">Find candidate lump-sum payment debits from bank accounts within ±10 days of expected bill date.</p>
            </div>
            <button id="btn-find-bank-candidates" data-id="${cycle.id}" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition">
              🔍 Find Bank Payment Candidates
            </button>
          </div>

          ${cycleBankCandidates.length > 0 ? `
            <div class="space-y-2">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${cycleBankCandidates.map(c => `
                  <div class="p-3 rounded-lg border cursor-pointer transition ${selectedCandidateID === c.id ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'} candidate-card" data-txid="${c.id}">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-white truncate max-w-[160px]">${c.payee_raw}</span>
                      <span class="text-xs font-bold text-rose-400 font-mono">${formatMoney(c.amount)}</span>
                    </div>
                    <div class="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>${c.date} &bull; ${c.account_name || 'Bank'}</span>
                      <span class="text-amber-400 font-mono font-semibold">Diff: ${formatMoney(Math.abs(Math.abs(c.amount) - Math.abs(cycle.expected_amount)))}</span>
                    </div>
                  </div>
                `).join('')}
              </div>

              <div class="flex justify-end pt-2">
                <button id="btn-reconcile-cycle-submit" data-id="${cycle.id}" ${!selectedCandidateID ? 'disabled' : ''} class="px-4 py-2 rounded-lg text-xs font-bold transition ${!selectedCandidateID ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20'}">
                  🔗 Link Selected Bank Payment
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// ---- Settings View ----

function renderSettingsView() {
  const currentModel = settingsData['localai_model'] || 'llama-3-8b';
  const currentBatchSize = settingsData['localai_batch_size'] || '5';
  return `
    <div class="max-w-2xl mx-auto glass-panel p-8 space-y-6">
      <h2 class="text-2xl font-bold text-white">Application &amp; LocalAI Settings</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1">LocalAI Endpoint URL</label>
          <input type="text" id="setting-localai-url" value="${settingsData['localai_url'] || 'http://localhost:8080'}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-medium text-slate-300">LocalAI Model</label>
            <button id="btn-fetch-models" type="button" class="text-[11px] text-purple-400 hover:text-purple-300 transition flex items-center gap-1 font-semibold">
              🔍 Fetch Available Models
            </button>
          </div>
          <div class="space-y-2">
            <select id="setting-localai-model-select" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500">
              <option value="${currentModel}">${currentModel} (Current / Default)</option>
            </select>
            <input type="text" id="setting-localai-model" value="${currentModel}" placeholder="Or enter custom model name" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
          </div>
          <p class="text-[10px] text-slate-400 mt-1">Query your LocalAI endpoint for available models or type a custom model ID.</p>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1">LocalAI API Key (optional)</label>
          <input type="password" id="setting-localai-key" value="${settingsData['localai_api_key'] || ''}" placeholder="Leave blank if not required" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1">Auto-Categorization Batch Size (Transactions per request)</label>
          <input type="number" id="setting-localai-batch-size" min="1" max="50" value="${currentBatchSize}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
          <p class="text-[10px] text-slate-400 mt-1">Controls how many transactions are sent per micro-batch (1 to 50, default: 5).</p>
        </div>
      </div>

      <div class="pt-4 border-t border-slate-800 flex gap-3">
        <button id="btn-save-settings" class="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 rounded-lg shadow-lg shadow-brand-500/20 text-xs transition">
          💾 Save Settings
        </button>
        <button id="btn-test-localai" class="flex-1 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 font-semibold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2">
          <span>🔌 Test LocalAI Connection</span>
        </button>
      </div>

      <div class="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
        <p class="font-bold text-slate-300">Connection Info</p>
        <p>OIDC Enabled: <span class="text-white">${authInfo?.oidc_enabled ? 'Yes' : 'No (Dev Mode)'}</span></p>
        <p>Logged in as: <span class="text-white">${authInfo?.user?.name || 'Local Admin'}</span></p>
      </div>
    </div>
  `;
}

// ---- Event Handlers ----

function attachEvents() {
  // Nav tabs
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = (e.currentTarget as HTMLElement).getAttribute('data-tab');
      if (tab) {
        activeTab = tab;
        renderApp();
      }
    });
  });

  // ---- Account Modal ----
  const openModal = () => { showAddAccountModal = true; renderApp(); };
  const closeModal = () => { showAddAccountModal = false; renderApp(); };

  document.getElementById('btn-add-account')?.addEventListener('click', openModal);
  document.getElementById('btn-add-account-empty')?.addEventListener('click', openModal);
  document.getElementById('btn-close-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

  const formAccount = document.getElementById('form-account') as HTMLFormElement;
  if (formAccount) {
    formAccount.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorDiv = document.getElementById('modal-error-msg');
      const saveBtn = document.getElementById('btn-save-account') as HTMLButtonElement;

      if (errorDiv) { errorDiv.classList.add('hidden'); errorDiv.textContent = ''; }
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

      try {
        const name = (document.getElementById('acc-name') as HTMLInputElement).value;
        const account_type = (document.getElementById('acc-type') as HTMLSelectElement).value;
        const institution = (document.getElementById('acc-institution') as HTMLInputElement).value;
        const currency = (document.getElementById('acc-currency') as HTMLSelectElement).value;
        const opening_balance = parseFloat((document.getElementById('acc-balance') as HTMLInputElement).value) || 0;
        const billing_day_primary = account_type === 'CREDIT_CARD' ? (parseInt((document.getElementById('acc-billing-primary') as HTMLInputElement)?.value) || 10) : null;
        const billing_day_secondary = account_type === 'CREDIT_CARD' && (document.getElementById('acc-billing-secondary') as HTMLInputElement)?.value
          ? parseInt((document.getElementById('acc-billing-secondary') as HTMLInputElement).value) || null : null;

        const res = await fetch('/api/v1/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            account_type,
            institution,
            currency,
            opening_balance,
            billing_day_primary,
            billing_day_secondary
          }),
        });

        if (res.ok) {
          showAddAccountModal = false;
          await loadData();
          renderApp();
          showToast('Account created successfully', 'success');
        } else {
          const errJson = await res.json().catch(() => ({}));
          const errMsg = errJson.error || res.statusText || 'Failed to create account';
          if (errorDiv) { errorDiv.textContent = errMsg; errorDiv.classList.remove('hidden'); }
        }
      } catch (err: any) {
        if (document.getElementById('modal-error-msg')) {
          const errorDiv = document.getElementById('modal-error-msg')!;
          errorDiv.textContent = `Network error: ${err.message || err}`;
          errorDiv.classList.remove('hidden');
        }
      } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Account'; }
      }
    });
  }

  document.querySelectorAll('.btn-delete-account').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (!id) return;
      if (!confirm('Delete this account? This will NOT delete its transactions.')) return;
      const res = await fetch(`/api/v1/accounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
        renderApp();
        showToast('Account deleted', 'success');
      } else {
        showToast('Failed to delete account', 'error');
      }
    });
  });

  // ---- Category Modal ----
  const openCatModal = () => { showAddCategoryModal = true; editingCategory = null; renderApp(); };
  const closeCatModal = () => { showAddCategoryModal = false; editingCategory = null; renderApp(); };

  document.getElementById('btn-add-category')?.addEventListener('click', openCatModal);
  document.getElementById('btn-add-category-empty')?.addEventListener('click', openCatModal);
  document.getElementById('btn-close-cat-modal')?.addEventListener('click', closeCatModal);
  document.getElementById('btn-cancel-cat-modal')?.addEventListener('click', closeCatModal);

  document.querySelectorAll('.btn-edit-cat').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      const cat = categoriesList.find(c => c.id === id);
      if (cat) { editingCategory = cat; showAddCategoryModal = false; renderApp(); }
    });
  });

  document.querySelectorAll('.btn-delete-cat').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (!id) return;
      if (!confirm('Delete this category? Transactions linked to it will become Uncategorized.')) return;
      const res = await fetch(`/api/v1/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
        renderApp();
        showToast('Category deleted', 'success');
      } else {
        showToast('Failed to delete category', 'error');
      }
    });
  });

  const formCategory = document.getElementById('form-category') as HTMLFormElement;
  if (formCategory) {
    formCategory.addEventListener('submit', async (e) => {
      e.preventDefault();
      const catErrorDiv = document.getElementById('cat-modal-error');
      const saveCatBtn = document.getElementById('btn-save-category') as HTMLButtonElement;

      if (catErrorDiv) { catErrorDiv.classList.add('hidden'); catErrorDiv.textContent = ''; }
      if (saveCatBtn) { saveCatBtn.disabled = true; saveCatBtn.textContent = 'Saving...'; }

      try {
        const name_en = (document.getElementById('cat-name-en') as HTMLInputElement).value.trim();
        const name_he = (document.getElementById('cat-name-he') as HTMLInputElement).value.trim();
        const category_type = (document.getElementById('cat-type') as HTMLSelectElement).value;
        const color_hex = (document.getElementById('cat-color') as HTMLInputElement).value;
        const icon = (document.getElementById('cat-icon') as HTMLInputElement).value.trim() || 'tag';
        const budgetVal = (document.getElementById('cat-budget') as HTMLInputElement).value;
        const monthly_budget = budgetVal ? parseFloat(budgetVal) : null;

        if (!name_en) {
          if (catErrorDiv) { catErrorDiv.textContent = 'English name is required'; catErrorDiv.classList.remove('hidden'); }
          return;
        }

        const payload = { name_en, name_he: name_he || name_en, category_type, color_hex, icon, monthly_budget };
        const isEdit = editingCategory !== null;
        const url = isEdit ? `/api/v1/categories/${editingCategory!.id}` : '/api/v1/categories';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          showAddCategoryModal = false;
          editingCategory = null;
          await loadData();
          renderApp();
          showToast(isEdit ? 'Category updated' : 'Category created', 'success');
        } else {
          const errJson = await res.json().catch(() => ({}));
          if (catErrorDiv) { catErrorDiv.textContent = errJson.error || 'Save failed'; catErrorDiv.classList.remove('hidden'); }
        }
      } finally {
        if (saveCatBtn) { saveCatBtn.disabled = false; saveCatBtn.textContent = editingCategory ? 'Update Category' : 'Create Category'; }
      }
    });
  }

  // ---- CSV Import Wizard Event Handlers ----

  document.getElementById('btn-reset-wizard')?.addEventListener('click', () => {
    wizardStep = 0;
    wizardFile = null;
    wizardInspectResult = null;
    wizardStagingResult = null;
    wizardCommitResult = null;
    renderApp();
  });

  // Step 0: Inspect CSV
  document.getElementById('btn-w0-next')?.addEventListener('click', async () => {
    const accSelect = document.getElementById('w0-account-id') as HTMLSelectElement;
    const fileInput = document.getElementById('w0-file') as HTMLInputElement;

    if (!accSelect?.value) {
      showToast('Please select a target account', 'error');
      return;
    }
    const file = fileInput?.files?.[0] || wizardFile;
    if (!file) {
      showToast('Please select a CSV file to inspect', 'error');
      return;
    }

    wizardAccountID = accSelect.value;
    wizardFile = file;

    const nextBtn = document.getElementById('btn-w0-next') as HTMLButtonElement;
    if (nextBtn) { nextBtn.disabled = true; nextBtn.innerText = '⏳ Inspecting CSV...'; }

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/v1/import/inspect', { method: 'POST', body: fd });
      if (res.ok) {
        wizardInspectResult = await res.json();
        const cols = wizardInspectResult?.columns || [];

        // Auto-guess column mappings
        const findCol = (terms: string[]) => cols.find(c => terms.some(t => c.toLowerCase().includes(t))) || cols[0] || '';
        const findColOrEmpty = (terms: string[]) => cols.find(c => terms.some(t => c.toLowerCase().includes(t))) || '';
        wizardMapping.date_col = findCol(['תאריך', 'date']);
        const descCols = cols.filter(c => ['תיאור', 'payee', 'merchant', 'name', 'פרטים', 'description', 'extended', 'הרחבה', 'פירוט'].some(t => c.toLowerCase().includes(t)));
        wizardMapping.payee_col = descCols[0] || findCol(['תיאור', 'payee', 'merchant', 'name', 'פרטים']);
        wizardMapping.payee_col_2 = descCols.length > 1 ? descCols[1] : '';
        wizardMapping.amount_col = findCol(['סכום', 'amount', 'total']);
        wizardMapping.debit_col = findCol(['חיוב', 'debit']);
        wizardMapping.credit_col = findCol(['זיכוי', 'credit']);
        wizardMapping.billing_date_col = findColOrEmpty(['תאריך חיוב', 'billing_date', 'billing date', 'chiyuv']);
        wizardMapping.original_amount_col = findColOrEmpty(['סכום מקורי', 'original_amount', 'original amount', 'mekori']);
        wizardMapping.original_currency_col = findColOrEmpty(['מטבע מקורי', 'original_currency', 'original currency', 'matbea']);

        wizardStep = 1;
        renderApp();
        showToast(`Identified ${cols.length} columns & ${wizardInspectResult?.total_rows} rows`, 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to inspect CSV file', 'error');
      }
    } catch {
      showToast('Network error inspecting CSV file', 'error');
    } finally {
      if (nextBtn) { nextBtn.disabled = false; nextBtn.innerText = 'Step 1: Inspect Columns & Load Preview →'; }
    }
  });

  // Step 1: Radio Mode Change
  document.getElementById('radio-mode-single')?.addEventListener('change', () => {
    wizardMapping.amount_mode = 'amount';
    document.getElementById('w1-single-amount-block')?.classList.remove('hidden');
    document.getElementById('w1-split-amount-block')?.classList.add('hidden');
  });

  document.getElementById('radio-mode-split')?.addEventListener('change', () => {
    wizardMapping.amount_mode = 'debit_credit';
    document.getElementById('w1-single-amount-block')?.classList.add('hidden');
    document.getElementById('w1-split-amount-block')?.classList.remove('hidden');
  });

  document.getElementById('btn-w1-back')?.addEventListener('click', () => {
    wizardStep = 0;
    renderApp();
  });

  // Step 1 -> Step 3 (Preview)
  document.getElementById('btn-w1-next')?.addEventListener('click', async () => {
    if (!wizardFile || !wizardAccountID) return;

    wizardMapping.date_col = (document.getElementById('w1-date-col') as HTMLSelectElement)?.value || wizardMapping.date_col;
    wizardMapping.payee_col = (document.getElementById('w1-payee-col') as HTMLSelectElement)?.value || wizardMapping.payee_col;
    wizardMapping.payee_col_2 = (document.getElementById('w1-payee-col-2') as HTMLSelectElement)?.value || '';
    if (wizardMapping.amount_mode === 'amount') {
      wizardMapping.amount_col = (document.getElementById('w1-amount-col') as HTMLSelectElement)?.value || wizardMapping.amount_col;
    } else {
      wizardMapping.debit_col = (document.getElementById('w1-debit-col') as HTMLSelectElement)?.value || wizardMapping.debit_col;
      wizardMapping.credit_col = (document.getElementById('w1-credit-col') as HTMLSelectElement)?.value || wizardMapping.credit_col;
    }
    wizardMapping.billing_date_col = (document.getElementById('w1-billing-date-col') as HTMLSelectElement)?.value || '';
    wizardMapping.original_amount_col = (document.getElementById('w1-orig-amount-col') as HTMLSelectElement)?.value || '';
    wizardMapping.original_currency_col = (document.getElementById('w1-orig-currency-col') as HTMLSelectElement)?.value || '';

    const nextBtn = document.getElementById('btn-w1-next') as HTMLButtonElement;
    if (nextBtn) { nextBtn.disabled = true; nextBtn.innerText = '⏳ Parsing Preview...'; }

    try {
      const fd = new FormData();
      fd.append('file', wizardFile);
      fd.append('account_id', wizardAccountID);
      fd.append('date_column', wizardMapping.date_col);
      fd.append('payee_column', wizardMapping.payee_col);
      if (wizardMapping.payee_col_2) {
        fd.append('payee_column_2', wizardMapping.payee_col_2);
      }
      if (wizardMapping.amount_mode === 'amount') {
        fd.append('amount_column', wizardMapping.amount_col);
      } else {
        fd.append('debit_column', wizardMapping.debit_col);
        fd.append('credit_column', wizardMapping.credit_col);
      }
      if (wizardMapping.billing_date_col) fd.append('billing_date_column', wizardMapping.billing_date_col);
      if (wizardMapping.original_amount_col) fd.append('original_amount_column', wizardMapping.original_amount_col);
      if (wizardMapping.original_currency_col) fd.append('original_currency_column', wizardMapping.original_currency_col);

      const res = await fetch('/api/v1/import/stage', { method: 'POST', body: fd });
      if (res.ok) {
        wizardStagingResult = await res.json();
        wizardStep = 3;
        renderApp();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to parse CSV preview', 'error');
      }
    } catch {
      showToast('Network error generating preview', 'error');
    } finally {
      if (nextBtn) { nextBtn.disabled = false; nextBtn.innerText = 'Step 3: Preview Transactions Mapping →'; }
    }
  });

  // Step 3 Back / Next
  document.getElementById('btn-w3-back')?.addEventListener('click', () => {
    wizardStep = 1;
    renderApp();
  });

  document.getElementById('btn-w3-next')?.addEventListener('click', () => {
    wizardStep = 4;
    renderApp();
  });

  // Step 4 Back / Commit
  document.getElementById('btn-w4-back')?.addEventListener('click', () => {
    wizardStep = 1;
    renderApp();
  });

  document.getElementById('btn-w4-commit')?.addEventListener('click', async () => {
    if (!wizardStagingResult || wizardStagingResult.passed_transactions.length === 0) {
      showToast('No valid transactions to commit', 'error');
      return;
    }

    const commitBtn = document.getElementById('btn-w4-commit') as HTMLButtonElement;
    if (commitBtn) { commitBtn.disabled = true; commitBtn.innerText = '⏳ Saving to Database...'; }

    try {
      const res = await fetch('/api/v1/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: wizardStagingResult.passed_transactions }),
      });
      if (res.ok) {
        wizardCommitResult = await res.json();
        wizardStep = 5;
        await loadData();
        renderApp();
        showToast(`Successfully imported ${wizardCommitResult?.imported} transactions`, 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to commit import to database', 'error');
      }
    } catch {
      showToast('Network error committing import', 'error');
    } finally {
      if (commitBtn) { commitBtn.disabled = false; }
    }
  });

  // Step 5 Finish Buttons
  document.getElementById('btn-w5-view-txs')?.addEventListener('click', () => {
    activeTab = 'transactions';
    renderApp();
  });

  document.getElementById('btn-w5-again')?.addEventListener('click', () => {
    wizardStep = 0;
    wizardFile = null;
    wizardInspectResult = null;
    wizardStagingResult = null;
    wizardCommitResult = null;
    renderApp();
  });

  // ---- Billing Cycles Event Handlers ----

  document.getElementById('cycle-account-filter')?.addEventListener('change', async (e) => {
    selectedCycleAccountID = (e.currentTarget as HTMLSelectElement).value;
    await fetchBillingCycles();
    renderApp();
  });

  document.getElementById('cycle-status-filter')?.addEventListener('change', async (e) => {
    selectedCycleStatusFilter = (e.currentTarget as HTMLSelectElement).value;
    await fetchBillingCycles();
    renderApp();
  });

  document.getElementById('btn-open-generate-modal')?.addEventListener('click', () => {
    showGenerateCyclesModal = true;
    renderApp();
  });

  document.getElementById('btn-close-generate-modal')?.addEventListener('click', () => {
    showGenerateCyclesModal = false;
    renderApp();
  });

  document.getElementById('btn-cancel-generate-modal')?.addEventListener('click', () => {
    showGenerateCyclesModal = false;
    renderApp();
  });

  document.getElementById('form-generate-cycles')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const account_id = (document.getElementById('gen-account-id') as HTMLSelectElement).value;
    const from_month = (document.getElementById('gen-from-month') as HTMLInputElement).value;
    const to_month = (document.getElementById('gen-to-month') as HTMLInputElement).value;

    const submitBtn = document.getElementById('btn-submit-generate') as HTMLButtonElement;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = 'Generating...'; }

    try {
      const res = await fetch('/api/v1/billing-cycles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id, from_month, to_month }),
      });

      if (res.ok) {
        showGenerateCyclesModal = false;
        await fetchBillingCycles();
        renderApp();
        showToast('Billing cycles generated successfully', 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to generate cycles', 'error');
      }
    } catch {
      showToast('Network error generating cycles', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  document.querySelectorAll('.btn-view-cycle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (!id) return;
      try {
        const res = await fetch(`/api/v1/billing-cycles/${id}`);
        if (res.ok) {
          activeCycleDetail = await res.json();
          cycleBankCandidates = [];
          selectedCandidateID = '';
          renderApp();
        } else {
          showToast('Failed to load cycle detail', 'error');
        }
      } catch {
        showToast('Network error loading cycle detail', 'error');
      }
    });
  });

  document.getElementById('btn-close-cycle-detail')?.addEventListener('click', () => {
    activeCycleDetail = null;
    cycleBankCandidates = [];
    selectedCandidateID = '';
    renderApp();
  });

  document.getElementById('btn-auto-populate-cycle')?.addEventListener('click', async (e) => {
    const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
    if (!id) return;
    try {
      const res = await fetch(`/api/v1/billing-cycles/${id}/auto-populate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(`Auto-assigned ${data.assigned_count} transactions`, 'success');
        const detailRes = await fetch(`/api/v1/billing-cycles/${id}`);
        if (detailRes.ok) activeCycleDetail = await detailRes.json();
        await fetchBillingCycles();
        renderApp();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Auto-populate failed', 'error');
      }
    } catch {
      showToast('Network error auto-populating cycle', 'error');
    }
  });

  document.getElementById('btn-find-bank-candidates')?.addEventListener('click', async (e) => {
    const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
    if (!id) return;
    try {
      const res = await fetch(`/api/v1/billing-cycles/${id}/bank-candidates`);
      if (res.ok) {
        cycleBankCandidates = (await res.json()) || [];
        selectedCandidateID = '';
        if (cycleBankCandidates.length === 0) {
          showToast('No bank payment candidates found within ±10 days', 'info');
        }
        renderApp();
      } else {
        showToast('Failed to find bank payment candidates', 'error');
      }
    } catch {
      showToast('Network error searching bank candidates', 'error');
    }
  });

  document.querySelectorAll('.candidate-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const txid = (e.currentTarget as HTMLElement).getAttribute('data-txid');
      if (txid) {
        selectedCandidateID = txid;
        renderApp();
      }
    });
  });

  document.getElementById('btn-reconcile-cycle-submit')?.addEventListener('click', async (e) => {
    const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
    if (!id || !selectedCandidateID) return;

    try {
      const res = await fetch(`/api/v1/billing-cycles/${id}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank_transaction_id: selectedCandidateID }),
      });
      if (res.ok) {
        showToast('Cycle reconciled with bank payment!', 'success');
        activeCycleDetail = null;
        cycleBankCandidates = [];
        selectedCandidateID = '';
        await fetchBillingCycles();
        await loadData();
        renderApp();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Reconciliation failed', 'error');
      }
    } catch {
      showToast('Network error reconciling cycle', 'error');
    }
  });

  document.querySelectorAll('.btn-reconcile-cycle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (!id) return;
      try {
        const res = await fetch(`/api/v1/billing-cycles/${id}`);
        if (res.ok) {
          activeCycleDetail = await res.json();
          const candRes = await fetch(`/api/v1/billing-cycles/${id}/bank-candidates`);
          if (candRes.ok) cycleBankCandidates = (await candRes.json()) || [];
          selectedCandidateID = '';
          renderApp();
        }
      } catch {
        showToast('Network error loading cycle', 'error');
      }
    });
  });

  document.querySelectorAll('.btn-unlink-cycle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (!id) return;
      if (!confirm('Unlink this bank payment from the billing cycle?')) return;
      try {
        const res = await fetch(`/api/v1/billing-cycles/${id}/unlink`, { method: 'POST' });
        if (res.ok) {
          showToast('Billing cycle unlinked', 'success');
          await fetchBillingCycles();
          await loadData();
          renderApp();
        } else {
          showToast('Failed to unlink cycle', 'error');
        }
      } catch {
        showToast('Network error unlinking cycle', 'error');
      }
    });
  });

  document.querySelectorAll('.btn-delete-cycle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (!id) return;
      if (!confirm('Delete this billing cycle?')) return;
      try {
        const res = await fetch(`/api/v1/billing-cycles/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Billing cycle deleted', 'success');
          await fetchBillingCycles();
          renderApp();
        } else {
          showToast('Failed to delete cycle', 'error');
        }
      } catch {
        showToast('Network error deleting cycle', 'error');
      }
    });
  });

  // ---- Fetch Available Models ----
  document.getElementById('btn-fetch-models')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-fetch-models')!;
    const url = (document.getElementById('setting-localai-url') as HTMLInputElement)?.value;
    const key = (document.getElementById('setting-localai-key') as HTMLInputElement)?.value;
    const select = document.getElementById('setting-localai-model-select') as HTMLSelectElement;
    const modelInput = document.getElementById('setting-localai-model') as HTMLInputElement;

    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '⏳ Fetching models...';
    (btn as HTMLButtonElement).disabled = true;

    try {
      const res = await fetch('/api/v1/categorize/localai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localai_url: url, localai_api_key: key }),
      });
      const data = await res.json();
      if (res.ok && data.models && Array.isArray(data.models) && data.models.length > 0) {
        if (select) {
          select.innerHTML = data.models.map((m: string) => `<option value="${m}">${m}</option>`).join('');
          if (modelInput) {
            modelInput.value = data.models[0];
          }
        }
        showToast(`Fetched ${data.models.length} available model(s)`, 'success');
      } else {
        showToast(`Could not fetch models: ${data.error || 'No models returned'}`, 'error');
      }
    } catch {
      showToast('Network error fetching models from server', 'error');
    } finally {
      btn.innerHTML = originalBtnText;
      (btn as HTMLButtonElement).disabled = false;
    }
  });

  // Sync model dropdown selection to custom model text input
  document.getElementById('setting-localai-model-select')?.addEventListener('change', (e) => {
    const selectedVal = (e.target as HTMLSelectElement).value;
    const modelInput = document.getElementById('setting-localai-model') as HTMLInputElement;
    if (modelInput) {
      modelInput.value = selectedVal;
    }
  });

  // ---- Settings Save ----
  document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
    const url = (document.getElementById('setting-localai-url') as HTMLInputElement).value;
    const model = (document.getElementById('setting-localai-model') as HTMLInputElement).value;
    const key = (document.getElementById('setting-localai-key') as HTMLInputElement).value;
    const batchSize = (document.getElementById('setting-localai-batch-size') as HTMLInputElement).value || '5';

    const res = await fetch('/api/v1/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        localai_url: url,
        localai_model: model,
        localai_api_key: key,
        localai_batch_size: batchSize,
      }),
    });
    if (res.ok) {
      settingsData = {
        ...settingsData,
        localai_url: url,
        localai_model: model,
        localai_api_key: key,
        localai_batch_size: batchSize,
      };
      showToast('Settings saved successfully', 'success');
      renderApp();
    } else {
      showToast('Failed to save settings', 'error');
    }
  });

  // ---- LocalAI Connection Test ----
  document.getElementById('btn-test-localai')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-test-localai')!;
    const url = (document.getElementById('setting-localai-url') as HTMLInputElement)?.value;
    const model = (document.getElementById('setting-localai-model') as HTMLInputElement)?.value;
    const key = (document.getElementById('setting-localai-key') as HTMLInputElement)?.value;

    btn.innerHTML = '⏳ Testing connection...';
    (btn as HTMLButtonElement).disabled = true;

    try {
      const res = await fetch('/api/v1/categorize/localai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localai_url: url, localai_model: model, localai_api_key: key }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Connection successful!', 'success');
      } else {
        showToast(`LocalAI Test Error: ${data.error || res.statusText}`, 'error');
      }
    } catch {
      showToast('Network error testing LocalAI connection', 'error');
    } finally {
      btn.innerHTML = '🔌 Test LocalAI Connection';
      (btn as HTMLButtonElement).disabled = false;
    }
  });

  // ---- Auto-Categorization Event Handlers & Status Polling ----

  const checkAutoCatStatus = async () => {
    try {
      const res = await fetch('/api/v1/categorize/status');
      if (!res.ok) return;
      const status: CategorizationStatus = await res.json();
      const wasRunning = categorizationStatus.running;
      categorizationStatus = status;

      if (status.running) {
        if (activeTab === 'autocat') {
          renderApp();
        }
      } else {
        if (autoCatPollTimer) {
          clearInterval(autoCatPollTimer);
          autoCatPollTimer = null;
        }
        if (wasRunning) {
          if (status.canceled) {
            showToast('Categorization run canceled by user', 'info');
          } else if (status.last_error) {
            showToast(`Categorization run stopped: ${status.last_error}`, 'error');
          } else if (status.total > 0) {
            showToast(`Finished categorizing ${status.processed} transactions!`, 'success');
          }
          await loadData();
          renderApp();
        }
      }
    } catch {
      // Ignore polling errors
    }
  };

  // Header Nav Button for Auto-Categorization
  document.getElementById('btn-trigger-ai')?.addEventListener('click', () => {
    activeTab = 'autocat';
    renderApp();
  });

  // Start Categorization
  document.getElementById('btn-start-autocat')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/v1/categorize/start', { method: 'POST' });
      const status: CategorizationStatus = await res.json().catch(() => ({}));
      if (res.ok || res.status === 202) {
        categorizationStatus = status;
        if (status.total === 0) {
          showToast('No uncategorized transactions to process', 'info');
        } else {
          showToast(`Auto-categorization started (${status.total} transactions across ${status.total_batches} batches)`, 'info');
          if (!autoCatPollTimer) {
            autoCatPollTimer = setInterval(checkAutoCatStatus, 2000);
          }
        }
        renderApp();
      } else {
        showToast(`Failed to start categorization: ${(status as any).error || res.statusText}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error starting categorization: ${err.message || err}`, 'error');
    }
  });

  // Cancel Categorization
  document.getElementById('btn-cancel-autocat')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/v1/categorize/cancel', { method: 'POST' });
      if (res.ok) {
        categorizationStatus = await res.json();
        showToast('Categorization run cancel signal sent', 'info');
        renderApp();
      }
    } catch (err: any) {
      showToast(`Error canceling categorization: ${err.message || err}`, 'error');
    }
  });

  // Save System Prompt
  document.getElementById('btn-save-prompt')?.addEventListener('click', async () => {
    const input = document.getElementById('autocat-prompt-input') as HTMLTextAreaElement;
    if (!input) return;
    const promptVal = input.value;
    try {
      const res = await fetch('/api/v1/categorize/prompt', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptVal }),
      });
      if (res.ok) {
        autoCatPrompt = promptVal;
        showToast('System prompt parameters saved', 'success');
      } else {
        showToast('Failed to save prompt parameters', 'error');
      }
    } catch {
      showToast('Error saving prompt parameters', 'error');
    }
  });

  // Reset System Prompt to Default
  document.getElementById('btn-reset-prompt')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/v1/categorize/prompt/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        autoCatPrompt = data.prompt || autoCatDefaultPrompt;
        const input = document.getElementById('autocat-prompt-input') as HTMLTextAreaElement;
        if (input) input.value = autoCatPrompt;
        showToast('System prompt reset to default', 'info');
      }
    } catch {
      showToast('Error resetting prompt', 'error');
    }
  });

  // View Batch Results Modal
  document.querySelectorAll('.btn-view-batch-results').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idxStr = (e.currentTarget as HTMLElement).getAttribute('data-batch-idx');
      if (idxStr !== null && categorizationStatus.batches) {
        const idx = parseInt(idxStr, 10);
        if (idx >= 0 && idx < categorizationStatus.batches.length) {
          selectedBatchResults = categorizationStatus.batches[idx];
          renderApp();
        }
      }
    });
  });

  // Close Batch Results Modal
  document.getElementById('btn-close-batch-modal')?.addEventListener('click', () => {
    selectedBatchResults = null;
    renderApp();
  });

  // Nav to Settings from LLM Config Card
  document.getElementById('btn-nav-settings')?.addEventListener('click', () => {
    activeTab = 'settings';
    renderApp();
  });

  // ---- AI Suggestion Buttons ----
  document.querySelectorAll('.btn-accept-suggestion').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const txid = (e.currentTarget as HTMLElement).getAttribute('data-txid');
      if (!txid) return;
      const res = await fetch('/api/v1/categories/accept-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: txid }),
      });
      if (res.ok) {
        await loadData();
        renderApp();
        showToast('Category suggestion accepted', 'success');
      } else {
        showToast('Failed to accept suggestion', 'error');
      }
    });
  });

  document.querySelectorAll('.btn-reject-suggestion').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const txid = (e.currentTarget as HTMLElement).getAttribute('data-txid');
      if (!txid) return;
      const res = await fetch('/api/v1/categories/reject-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: txid }),
      });
      if (res.ok) {
        await loadData();
        renderApp();
        showToast('Category suggestion rejected', 'info');
      } else {
        showToast('Failed to reject suggestion', 'error');
      }
    });
  });

  // ---- Inline Category Selectors ----
  document.querySelectorAll('.tx-cat-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const el = e.currentTarget as HTMLSelectElement;
      const txid = el.getAttribute('data-txid');
      const catID = el.value || null;
      if (!txid) return;

      const res = await fetch(`/api/v1/transactions/${txid}/category`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: catID,
          categorized_by: catID ? 'MANUAL' : 'UNSET',
          is_reviewed: catID ? true : false,
        }),
      });

      if (res.ok) {
        await loadData();
        renderApp();
        showToast(catID ? 'Category updated' : 'Category cleared', 'success');
      } else {
        showToast('Failed to update category', 'error');
      }
    });
  });

  // ---- Widget-level Account Filters ----
  document.getElementById('widget-acc-cashflow')?.addEventListener('change', async (e) => {
    widgetFilters.cashflowAcc = (e.target as HTMLSelectElement).value;
    await loadData();
    renderApp();
  });
  const handleCashFlowDateChange = async () => {
    const fromInput = document.getElementById('widget-cashflow-from') as HTMLInputElement;
    const toInput = document.getElementById('widget-cashflow-to') as HTMLInputElement;
    if (!fromInput || !toInput) return;
    const newFrom = fromInput.value;
    const newTo = toInput.value;
    if (newFrom && newTo && (newFrom !== widgetFilters.cashflowFromMonth || newTo !== widgetFilters.cashflowToMonth)) {
      widgetFilters.cashflowFromMonth = newFrom;
      widgetFilters.cashflowToMonth = newTo;
      await loadData();
      renderApp();
    }
  };

  document.getElementById('widget-cashflow-from')?.addEventListener('change', handleCashFlowDateChange);
  document.getElementById('widget-cashflow-from')?.addEventListener('input', handleCashFlowDateChange);
  document.getElementById('widget-cashflow-to')?.addEventListener('change', handleCashFlowDateChange);
  document.getElementById('widget-cashflow-to')?.addEventListener('input', handleCashFlowDateChange);

  const setCashFlowPreset = async (monthsCount: number) => {
    const now = new Date();
    const toYear = now.getFullYear();
    const toMonth = String(now.getMonth() + 1).padStart(2, '0');
    widgetFilters.cashflowToMonth = `${toYear}-${toMonth}`;

    const fromDate = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1), 1);
    const fromYear = fromDate.getFullYear();
    const fromMonth = String(fromDate.getMonth() + 1).padStart(2, '0');
    widgetFilters.cashflowFromMonth = `${fromYear}-${fromMonth}`;

    await loadData();
    renderApp();
  };

  document.getElementById('btn-cashflow-preset-3m')?.addEventListener('click', () => setCashFlowPreset(3));
  document.getElementById('btn-cashflow-preset-6m')?.addEventListener('click', () => setCashFlowPreset(6));
  document.getElementById('btn-cashflow-preset-12m')?.addEventListener('click', () => setCashFlowPreset(12));
  document.getElementById('widget-acc-donut')?.addEventListener('change', async (e) => {
    widgetFilters.donutAcc = (e.target as HTMLSelectElement).value;
    await loadData();
    renderApp();
  });
  const handleDonutDateChange = async () => {
    const fromInput = document.getElementById('widget-donut-from') as HTMLInputElement;
    const toInput = document.getElementById('widget-donut-to') as HTMLInputElement;
    if (!fromInput || !toInput) return;
    const newFrom = fromInput.value;
    const newTo = toInput.value;
    if (newFrom && newTo && (newFrom !== widgetFilters.donutFromMonth || newTo !== widgetFilters.donutToMonth)) {
      widgetFilters.donutFromMonth = newFrom;
      widgetFilters.donutToMonth = newTo;
      await loadData();
      renderApp();
    }
  };
  document.getElementById('widget-donut-from')?.addEventListener('change', handleDonutDateChange);
  document.getElementById('widget-donut-from')?.addEventListener('input', handleDonutDateChange);
  document.getElementById('widget-donut-to')?.addEventListener('change', handleDonutDateChange);
  document.getElementById('widget-donut-to')?.addEventListener('input', handleDonutDateChange);

  const setDonutPreset = async (monthsCount: number) => {
    const now = new Date();
    const toYear = now.getFullYear();
    const toMonth = String(now.getMonth() + 1).padStart(2, '0');
    widgetFilters.donutToMonth = `${toYear}-${toMonth}`;

    const fromDate = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1), 1);
    const fromYear = fromDate.getFullYear();
    const fromMonth = String(fromDate.getMonth() + 1).padStart(2, '0');
    widgetFilters.donutFromMonth = `${fromYear}-${fromMonth}`;

    await loadData();
    renderApp();
  };
  document.getElementById('btn-donut-preset-3m')?.addEventListener('click', () => setDonutPreset(3));
  document.getElementById('btn-donut-preset-6m')?.addEventListener('click', () => setDonutPreset(6));
  document.getElementById('btn-donut-preset-12m')?.addEventListener('click', () => setDonutPreset(12));

  const handleNetWorthDateChange = async () => {
    const fromInput = document.getElementById('widget-networth-from') as HTMLInputElement;
    const toInput = document.getElementById('widget-networth-to') as HTMLInputElement;
    if (!fromInput || !toInput) return;
    const newFrom = fromInput.value;
    const newTo = toInput.value;
    if (newFrom && newTo && (newFrom !== widgetFilters.networthFromMonth || newTo !== widgetFilters.networthToMonth)) {
      widgetFilters.networthFromMonth = newFrom;
      widgetFilters.networthToMonth = newTo;
      await loadData();
      renderApp();
    }
  };
  document.getElementById('widget-networth-from')?.addEventListener('change', handleNetWorthDateChange);
  document.getElementById('widget-networth-from')?.addEventListener('input', handleNetWorthDateChange);
  document.getElementById('widget-networth-to')?.addEventListener('change', handleNetWorthDateChange);
  document.getElementById('widget-networth-to')?.addEventListener('input', handleNetWorthDateChange);

  const setNetWorthPreset = async (monthsCount: number) => {
    const now = new Date();
    const toYear = now.getFullYear();
    const toMonth = String(now.getMonth() + 1).padStart(2, '0');
    widgetFilters.networthToMonth = `${toYear}-${toMonth}`;

    const fromDate = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1), 1);
    const fromYear = fromDate.getFullYear();
    const fromMonth = String(fromDate.getMonth() + 1).padStart(2, '0');
    widgetFilters.networthFromMonth = `${fromYear}-${fromMonth}`;

    await loadData();
    renderApp();
  };
  document.getElementById('btn-networth-preset-3m')?.addEventListener('click', () => setNetWorthPreset(3));
  document.getElementById('btn-networth-preset-6m')?.addEventListener('click', () => setNetWorthPreset(6));
  document.getElementById('btn-networth-preset-12m')?.addEventListener('click', () => setNetWorthPreset(12));
  document.getElementById('widget-acc-payoff')?.addEventListener('change', async (e) => {
    widgetFilters.payoffAcc = (e.target as HTMLSelectElement).value;
    await loadData();
    renderApp();
  });
  document.getElementById('widget-acc-budget')?.addEventListener('change', async (e) => {
    widgetFilters.budgetAcc = (e.target as HTMLSelectElement).value;
    await loadData();
    renderApp();
  });
  document.getElementById('widget-acc-subscriptions')?.addEventListener('change', async (e) => {
    widgetFilters.subscriptionsAcc = (e.target as HTMLSelectElement).value;
    await loadData();
    renderApp();
  });
  document.getElementById('widget-acc-mom')?.addEventListener('change', async (e) => {
    widgetFilters.momAcc = (e.target as HTMLSelectElement).value;
    await loadData();
    renderApp();
  });
  const handleMoMDateChange = async () => {
    const fromInput = document.getElementById('widget-mom-from') as HTMLInputElement;
    const toInput = document.getElementById('widget-mom-to') as HTMLInputElement;
    if (!fromInput || !toInput) return;
    const newFrom = fromInput.value;
    const newTo = toInput.value;
    if (newFrom && newTo && (newFrom !== widgetFilters.momFromMonth || newTo !== widgetFilters.momToMonth)) {
      widgetFilters.momFromMonth = newFrom;
      widgetFilters.momToMonth = newTo;
      await loadData();
      renderApp();
    }
  };

  document.getElementById('widget-mom-from')?.addEventListener('change', handleMoMDateChange);
  document.getElementById('widget-mom-from')?.addEventListener('input', handleMoMDateChange);
  document.getElementById('widget-mom-to')?.addEventListener('change', handleMoMDateChange);
  document.getElementById('widget-mom-to')?.addEventListener('input', handleMoMDateChange);

  const setMoMPreset = async (monthsCount: number) => {
    const now = new Date();
    const toYear = now.getFullYear();
    const toMonth = String(now.getMonth() + 1).padStart(2, '0');
    widgetFilters.momToMonth = `${toYear}-${toMonth}`;

    const fromDate = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1), 1);
    const fromYear = fromDate.getFullYear();
    const fromMonth = String(fromDate.getMonth() + 1).padStart(2, '0');
    widgetFilters.momFromMonth = `${fromYear}-${fromMonth}`;

    await loadData();
    renderApp();
  };

  document.getElementById('btn-mom-preset-3m')?.addEventListener('click', () => setMoMPreset(3));
  document.getElementById('btn-mom-preset-6m')?.addEventListener('click', () => setMoMPreset(6));
  document.getElementById('btn-mom-preset-12m')?.addEventListener('click', () => setMoMPreset(12));

  // ---- Transaction Filters & Pagination ----
  document.getElementById('tx-filter-account')?.addEventListener('change', async (e) => {
    txFilterAccountID = (e.target as HTMLSelectElement).value;
    txPage = 0;
    await loadTransactions();
    renderApp();
  });

  document.getElementById('tx-filter-type')?.addEventListener('change', async (e) => {
    txFilterCategoryType = (e.target as HTMLSelectElement).value;
    if (txFilterCategoryType) {
      const validIDs = new Set(categoriesList.filter(c => c.category_type === txFilterCategoryType).map(c => c.id));
      txFilterCategoryIDs = txFilterCategoryIDs.filter(id => validIDs.has(id));
    }
    txPage = 0;
    await loadTransactions();
    renderApp();
  });

  // Toggle Category Subfilter Dropdown
  document.getElementById('btn-toggle-cat-dropdown')?.addEventListener('click', (e) => {
    e.stopPropagation();
    isCatDropdownOpen = !isCatDropdownOpen;
    renderApp();
  });

  // Select All Categories
  document.getElementById('btn-select-all-cats')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const availableCategories = txFilterCategoryType
      ? categoriesList.filter(c => c.category_type === txFilterCategoryType)
      : categoriesList;
    txFilterCategoryIDs = availableCategories.map(c => c.id);
    txPage = 0;
    await loadTransactions();
    renderApp();
  });

  // Clear All Categories Selection
  document.getElementById('btn-clear-all-cats')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    txFilterCategoryIDs = [];
    txPage = 0;
    await loadTransactions();
    renderApp();
  });

  // Individual Checkbox Toggle
  document.querySelectorAll('.chk-category-filter').forEach(chk => {
    chk.addEventListener('change', async (e) => {
      e.stopPropagation();
      const cb = e.currentTarget as HTMLInputElement;
      const catId = cb.getAttribute('data-cat-id');
      if (!catId) return;
      if (cb.checked) {
        if (!txFilterCategoryIDs.includes(catId)) {
          txFilterCategoryIDs.push(catId);
        }
      } else {
        txFilterCategoryIDs = txFilterCategoryIDs.filter(id => id !== catId);
      }
      txPage = 0;
      await loadTransactions();
      renderApp();
    });
  });

  // Remove Category Pill
  document.querySelectorAll('.btn-remove-cat-filter').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const catId = (e.currentTarget as HTMLElement).getAttribute('data-cat-id');
      if (catId) {
        txFilterCategoryIDs = txFilterCategoryIDs.filter(id => id !== catId);
        txPage = 0;
        await loadTransactions();
        renderApp();
      }
    });
  });

  // Clear Category Pills
  document.getElementById('btn-clear-cat-pills')?.addEventListener('click', async () => {
    txFilterCategoryIDs = [];
    txPage = 0;
    await loadTransactions();
    renderApp();
  });

  document.getElementById('tx-filter-start')?.addEventListener('change', async (e) => {
    txFilterStartDate = (e.target as HTMLInputElement).value;
    txPage = 0;
    await loadTransactions();
    renderApp();
  });

  document.getElementById('tx-filter-end')?.addEventListener('change', async (e) => {
    txFilterEndDate = (e.target as HTMLInputElement).value;
    txPage = 0;
    await loadTransactions();
    renderApp();
  });

  document.getElementById('tx-filter-search')?.addEventListener('change', async (e) => {
    txFilterSearch = (e.target as HTMLInputElement).value;
    txPage = 0;
    await loadTransactions();
    renderApp();
  });

  document.getElementById('btn-tx-clear-filters')?.addEventListener('click', async () => {
    txFilterAccountID = '';
    txFilterCategoryType = '';
    txFilterCategoryIDs = [];
    txFilterStartDate = '';
    txFilterEndDate = '';
    txFilterSearch = '';
    isCatDropdownOpen = false;
    txPage = 0;
    await loadTransactions();
    renderApp();
  });

  document.getElementById('tx-page-size')?.addEventListener('change', async (e) => {
    txLimit = parseInt((e.target as HTMLSelectElement).value) || 25;
    txPage = 0;
    await loadTransactions();
    renderApp();
  });

  document.getElementById('btn-tx-prev')?.addEventListener('click', async () => {
    if (txPage > 0) {
      txPage--;
      await loadTransactions();
      renderApp();
    }
  });

  document.getElementById('btn-tx-next')?.addEventListener('click', async () => {
    if ((txPage + 1) * txLimit < txTotal) {
      txPage++;
      await loadTransactions();
      renderApp();
    }
  });

  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('tx-cat-dropdown-panel');
    const toggleBtn = document.getElementById('btn-toggle-cat-dropdown');
    if (isCatDropdownOpen && dropdown && toggleBtn) {
      const target = e.target as Node;
      if (!dropdown.contains(target) && !toggleBtn.contains(target)) {
        isCatDropdownOpen = false;
        renderApp();
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', initApp);
