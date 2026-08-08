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
const TX_PAGE_SIZE = 50;

let showAddAccountModal = false;
let showAddCategoryModal = false;
let editingCategory: Category | null = null;

// Reconciliation state
let reconBankTx: Transaction | null = null;
let reconCandidates: Transaction[] = [];
let reconSelectedIDs: Set<string> = new Set();

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
    const [accRes, txRes, catRes, bvaRes, subRes, donutRes, cfRes, authRes,
           nwRes, ccRes, fxRes, anomRes, momRes, sankeyRes, settingsRes] = await Promise.all([
      fetch('/api/v1/accounts'),
      fetch(`/api/v1/transactions?limit=${TX_PAGE_SIZE}&offset=${txPage * TX_PAGE_SIZE}`),
      fetch('/api/v1/categories'),
      fetch('/api/v1/reports/budget-vs-actual'),
      fetch('/api/v1/reports/subscriptions'),
      fetch('/api/v1/reports/category-donut'),
      fetch('/api/v1/reports/cash-flow'),
      fetch('/api/v1/auth/info'),
      fetch('/api/v1/reports/net-worth'),
      fetch('/api/v1/reports/cc-payoff'),
      fetch('/api/v1/reports/foreign-currency'),
      fetch('/api/v1/reports/anomalies'),
      fetch('/api/v1/reports/mom-heatmap'),
      fetch('/api/v1/reports/sankey'),
      fetch('/api/v1/settings'),
    ]);

    if (accRes.status === 401 || txRes.status === 401) {
      window.location.href = '/auth/login';
      return;
    }

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
  } catch (e) {
    console.error('Failed to fetch data from API server', e);
  }
}

async function loadTransactions() {
  try {
    const res = await fetch(`/api/v1/transactions?limit=${TX_PAGE_SIZE}&offset=${txPage * TX_PAGE_SIZE}`);
    if (res.status === 401) {
      window.location.href = '/auth/login';
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

        <nav class="flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/60 flex-wrap">
          ${renderNavButton('dashboard', '📊 Dashboard')}
          ${renderNavButton('accounts', '🏦 Accounts')}
          ${renderNavButton('transactions', '💳 Transactions')}
          ${renderNavButton('categories', '🏷️ Categories')}
          ${renderNavButton('import', '📤 Import')}
          ${renderNavButton('reconciliation', '🔗 Reconciliation')}
          ${renderNavButton('settings', '⚙️ Settings')}
        </nav>

        <div class="flex items-center gap-3">
          ${authInfo?.user ? `
            <div class="flex items-center gap-2">
              <span class="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                👤 ${authInfo.user.name || authInfo.user.email}
              </span>
              ${authInfo.oidc_enabled ? `
                <a href="/auth/logout" class="text-xs text-rose-400 hover:text-rose-300 font-medium transition px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20">
                  Logout
                </a>
              ` : ''}
            </div>
          ` : `
            <a href="/auth/login" class="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-lg transition">
              🔑 Log in via OIDC
            </a>
          `}
          <button id="btn-trigger-ai" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-lg shadow-purple-500/20 transition flex items-center gap-2">
            <span>✨ Run LocalAI</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
      ${activeTab === 'dashboard' ? renderDashboard(netWorth, totalAssets, totalLiabilities) : ''}
      ${activeTab === 'accounts' ? renderAccountsView() : ''}
      ${activeTab === 'transactions' ? renderTransactionsView() : ''}
      ${activeTab === 'categories' ? renderCategoriesView() : ''}
      ${activeTab === 'import' ? renderImportView() : ''}
      ${activeTab === 'reconciliation' ? renderReconciliationView() : ''}
      ${activeTab === 'settings' ? renderSettingsView() : ''}
    </main>

    ${showAddAccountModal ? renderAccountModal() : ''}
    ${showAddCategoryModal || editingCategory ? renderCategoryModal() : ''}

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
          <h3 class="font-bold text-sm text-white">Monthly Cash Flow (Income vs Expenses)</h3>
          <div class="h-64 relative">
            <canvas id="cashflow-chart-canvas"></canvas>
          </div>
        </div>
        <div class="glass-panel p-6 space-y-4">
          <h3 class="font-bold text-sm text-white">Category Expense Breakdown</h3>
          <div class="h-64 relative">
            <canvas id="donut-chart-canvas"></canvas>
          </div>
        </div>
      </div>

      <!-- Charts Row 2: Net Worth Trend + CC Payoff -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-panel p-6 space-y-4">
          <h3 class="font-bold text-sm text-white">Net Worth Over Time</h3>
          <div class="h-64 relative">
            <canvas id="networth-chart-canvas"></canvas>
          </div>
        </div>
        <div class="glass-panel p-6 space-y-4">
          <h3 class="font-bold text-sm text-white">Installment Payoff Forecast</h3>
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
          <h3 class="font-bold text-sm text-white">Budget vs Actual (This Month)</h3>
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
          <h3 class="font-bold text-sm text-white">Recurring Fixed Subscriptions</h3>
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
        <h3 class="font-bold text-sm text-white">Month-over-Month Spending Heatmap</h3>
        ${momHeatmapData.length === 0
          ? `<p class="text-xs text-slate-500">No categorized expense data yet.</p>`
          : `<div id="mom-heatmap-container" class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead>
                  <tr>
                    <th class="text-left py-2 pr-4 text-slate-400 font-medium w-40">Category</th>
                    ${momMonths.map(m => `<th class="text-center py-2 px-2 text-slate-400 font-medium">${m}</th>`).join('')}
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/40" id="mom-heatmap-tbody">
                  ${momHeatmapData.map(row => `
                    <tr class="hover:bg-slate-900/30 transition">
                      <td class="py-2 pr-4 text-slate-300 font-medium flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style="background:${row.color_hex}"></span>
                        ${row.category_name}
                      </td>
                      ${row.months.map(cell => {
                        const intensity = maxMoM > 0 ? cell.amount / maxMoM : 0;
                        const alpha = (0.1 + intensity * 0.75).toFixed(2);
                        return `<td class="py-2 px-2 text-center rounded" style="background:${cell.amount > 0 ? `rgba(244,63,94,${alpha})` : 'transparent'}">
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
  const totalPages = Math.ceil(txTotal / TX_PAGE_SIZE);
  const currentPage = txPage + 1;

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
        <span class="text-xs text-slate-400">${txTotal} total transactions</span>
      </div>

      <div class="glass-panel p-6">
        ${renderTransactionTableRows(transactionsList)}

        <!-- Pagination -->
        ${txTotal > TX_PAGE_SIZE ? `
          <div class="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
            <span class="text-xs text-slate-400">Page ${currentPage} of ${totalPages} &bull; ${txTotal} total</span>
            <div class="flex gap-2">
              <button id="btn-tx-prev" ${txPage === 0 ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg text-xs font-medium ${txPage === 0 ? 'text-slate-600 bg-slate-900/40 cursor-not-allowed' : 'text-slate-300 bg-slate-800 hover:bg-slate-700 transition'}">← Prev</button>
              <button id="btn-tx-next" ${currentPage >= totalPages ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg text-xs font-medium ${currentPage >= totalPages ? 'text-slate-600 bg-slate-900/40 cursor-not-allowed' : 'text-slate-300 bg-slate-800 hover:bg-slate-700 transition'}">Next →</button>
            </div>
          </div>
        ` : ''}
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
  amount_mode: 'amount', // 'amount' | 'debit_credit'
  amount_col: '',
  debit_col: '',
  credit_col: '',
};
let wizardStagingResult: {
  passed_transactions: Transaction[];
  failed_rows: { row_index: number; raw_row: string[]; reason: string }[];
  passed_count: number;
  failed_count: number;
  duplicate_count: number;
} | null = null;
let wizardCommitResult: { imported: number; duplicates: number; total: number } | null = null;

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

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Date Column *</label>
                <select id="w1-date-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  ${wizardInspectResult.columns.map(c => `
                    <option value="${c}" ${wizardMapping.date_col === c ? 'selected' : ''}>${c}</option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Payee / Merchant Column *</label>
                <select id="w1-payee-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  ${wizardInspectResult.columns.map(c => `
                    <option value="${c}" ${wizardMapping.payee_col === c ? 'selected' : ''}>${c}</option>
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

// ---- Reconciliation View ----

function renderReconciliationView() {
  const bankDebits = transactionsList.filter(t => {
    const acc = accountsList.find(a => a.id === t.account_id);
    return acc?.account_type === 'BANK' && t.amount < 0;
  });

  const reconTotal = reconCandidates
    .filter(c => reconSelectedIDs.has(c.id))
    .reduce((sum, c) => sum + Math.abs(c.amount), 0);

  const bankDebitAmt = reconBankTx ? Math.abs(reconBankTx.amount) : 0;
  const diff = bankDebitAmt - reconTotal;

  return `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-white">Statement Payment Reconciliation</h2>
        <p class="text-xs text-slate-400 mt-1">Match a single Bank lump-sum debit against individual Credit Card transactions.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Step 1: Select Bank Debit -->
        <div class="glass-panel p-6 space-y-4">
          <h3 class="text-sm font-bold text-white">Step 1: Select Bank Debit</h3>
          ${bankDebits.length === 0 ? `
            <p class="text-xs text-slate-500">No bank debit transactions found. Import bank account CSV first.</p>
          ` : `
            <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
              ${bankDebits.map(t => `
                <div class="p-3 rounded-lg border cursor-pointer transition ${reconBankTx?.id === t.id ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'}
                     recon-bank-row" data-txid="${t.id}">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-white truncate max-w-[180px]">${t.payee_raw}</span>
                    <span class="text-xs font-bold text-rose-400 font-mono">${formatMoney(t.amount)}</span>
                  </div>
                  <span class="text-xs text-slate-400">${t.date} &bull; ${t.account_name}</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Step 2: CC Candidates -->
        <div class="glass-panel p-6 space-y-4">
          <h3 class="text-sm font-bold text-white">Step 2: Match Credit Card Charges</h3>
          ${!reconBankTx ? `
            <p class="text-xs text-slate-500">← Select a bank debit on the left to see matching CC candidates.</p>
          ` : reconCandidates.length === 0 ? `
            <div class="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
              No CC candidates found for this debit. The heuristic searches for CC charges within ±3 days that sum close to the bank debit amount.
            </div>
          ` : `
            <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
              ${reconCandidates.map(c => `
                <label class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${reconSelectedIDs.has(c.id) ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'}">
                  <input type="checkbox" class="recon-cc-check" data-txid="${c.id}" ${reconSelectedIDs.has(c.id) ? 'checked' : ''} />
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-medium text-white truncate max-w-[160px]">${c.payee_raw}</span>
                      <span class="text-xs font-bold text-rose-400 font-mono">${formatMoney(c.amount)}</span>
                    </div>
                    <span class="text-xs text-slate-400">${c.date}</span>
                  </div>
                </label>
              `).join('')}
            </div>

            <!-- Running total -->
            <div class="p-3 rounded-lg bg-slate-900/60 border ${Math.abs(diff) < 1 ? 'border-emerald-500/30' : 'border-amber-500/30'} text-xs space-y-1">
              <div class="flex justify-between">
                <span class="text-slate-400">Bank Debit:</span>
                <span class="text-white font-mono font-bold">${formatMoney(bankDebitAmt)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Selected CC Total:</span>
                <span class="text-brand-400 font-mono font-bold">${formatMoney(reconTotal)}</span>
              </div>
              <div class="flex justify-between border-t border-slate-800 pt-1">
                <span class="text-slate-400">Difference:</span>
                <span class="${Math.abs(diff) < 1 ? 'text-emerald-400' : 'text-amber-400'} font-mono font-bold">${formatMoney(diff)}</span>
              </div>
            </div>

            <button id="btn-reconcile" ${reconSelectedIDs.size === 0 ? 'disabled' : ''} class="w-full text-xs font-bold py-2 rounded-lg transition ${reconSelectedIDs.size === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20'}">
              🔗 Reconcile Selected Transactions
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}

// ---- Settings View ----

function renderSettingsView() {
  return `
    <div class="max-w-2xl mx-auto glass-panel p-8 space-y-6">
      <h2 class="text-2xl font-bold text-white">Application &amp; LocalAI Settings</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1">LocalAI Endpoint URL</label>
          <input type="text" id="setting-localai-url" value="${settingsData['localai_url'] || 'http://localhost:8080'}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1">LocalAI Model Name</label>
          <input type="text" id="setting-localai-model" value="${settingsData['localai_model'] || 'llama-3-8b'}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1">LocalAI API Key (optional)</label>
          <input type="password" id="setting-localai-key" value="${settingsData['localai_api_key'] || ''}" placeholder="Leave blank if not required" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
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

        const res = await fetch('/api/v1/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, account_type, institution, currency, opening_balance }),
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
        wizardMapping.date_col = findCol(['תאריך', 'date']);
        wizardMapping.payee_col = findCol(['תיאור', 'payee', 'merchant', 'name', 'פרטים']);
        wizardMapping.amount_col = findCol(['סכום', 'amount', 'total']);
        wizardMapping.debit_col = findCol(['חיוב', 'debit']);
        wizardMapping.credit_col = findCol(['זיכוי', 'credit']);

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
    if (wizardMapping.amount_mode === 'amount') {
      wizardMapping.amount_col = (document.getElementById('w1-amount-col') as HTMLSelectElement)?.value || wizardMapping.amount_col;
    } else {
      wizardMapping.debit_col = (document.getElementById('w1-debit-col') as HTMLSelectElement)?.value || wizardMapping.debit_col;
      wizardMapping.credit_col = (document.getElementById('w1-credit-col') as HTMLSelectElement)?.value || wizardMapping.credit_col;
    }

    const nextBtn = document.getElementById('btn-w1-next') as HTMLButtonElement;
    if (nextBtn) { nextBtn.disabled = true; nextBtn.innerText = '⏳ Parsing Preview...'; }

    try {
      const fd = new FormData();
      fd.append('file', wizardFile);
      fd.append('account_id', wizardAccountID);
      fd.append('date_column', wizardMapping.date_col);
      fd.append('payee_column', wizardMapping.payee_col);
      if (wizardMapping.amount_mode === 'amount') {
        fd.append('amount_column', wizardMapping.amount_col);
      } else {
        fd.append('debit_column', wizardMapping.debit_col);
        fd.append('credit_column', wizardMapping.credit_col);
      }

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

  // ---- Reconciliation ----
  document.querySelectorAll('.recon-bank-row').forEach(row => {
    row.addEventListener('click', async (e) => {
      const txid = (e.currentTarget as HTMLElement).getAttribute('data-txid');
      const tx = transactionsList.find(t => t.id === txid);
      if (!tx) return;

      reconBankTx = tx;
      reconCandidates = [];
      reconSelectedIDs = new Set();

      try {
        const res = await fetch(`/api/v1/reconciliation/candidates?bank_transaction_id=${txid}`);
        if (res.ok) {
          const data = await res.json();
          reconCandidates = data.candidates || [];
        } else {
          showToast('Failed to fetch candidates', 'error');
        }
      } catch {
        showToast('Network error fetching candidates', 'error');
      }
      renderApp();
    });
  });

  document.querySelectorAll('.recon-cc-check').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const cb = e.currentTarget as HTMLInputElement;
      const txid = cb.getAttribute('data-txid')!;
      if (cb.checked) reconSelectedIDs.add(txid);
      else reconSelectedIDs.delete(txid);
      renderApp();
    });
  });

  document.getElementById('btn-reconcile')?.addEventListener('click', async () => {
    if (!reconBankTx || reconSelectedIDs.size === 0) return;
    const res = await fetch('/api/v1/reconciliation/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bank_transaction_id: reconBankTx.id,
        credit_card_transaction_ids: [...reconSelectedIDs],
      }),
    });
    if (res.ok) {
      reconBankTx = null;
      reconCandidates = [];
      reconSelectedIDs = new Set();
      await loadData();
      renderApp();
      showToast('Transactions reconciled successfully', 'success');
    } else {
      showToast('Reconciliation failed', 'error');
    }
  });

  // ---- Settings Save ----
  document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
    const url = (document.getElementById('setting-localai-url') as HTMLInputElement).value;
    const model = (document.getElementById('setting-localai-model') as HTMLInputElement).value;
    const key = (document.getElementById('setting-localai-key') as HTMLInputElement).value;

    const res = await fetch('/api/v1/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localai_url: url, localai_model: model, localai_api_key: key }),
    });
    if (res.ok) {
      settingsData = { ...settingsData, localai_url: url, localai_model: model, localai_api_key: key };
      showToast('Settings saved successfully', 'success');
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

  // ---- LocalAI Batch ----
  document.getElementById('btn-trigger-ai')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-trigger-ai')!;
    btn.innerHTML = '⏳ Categorizing...';
    (btn as HTMLButtonElement).disabled = true;
    try {
      const res = await fetch('/api/v1/categorize/localai', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(`LocalAI: ${data.status || 'Categorization complete'}`, 'success');
        await loadData();
        renderApp();
      } else {
        showToast(`LocalAI Error: ${data.error || res.statusText}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error triggering LocalAI: ${err.message || err}`, 'error');
    } finally {
      btn.innerHTML = '✨ Run LocalAI';
      (btn as HTMLButtonElement).disabled = false;
    }
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

  // ---- Transaction Pagination ----
  document.getElementById('btn-tx-prev')?.addEventListener('click', async () => {
    if (txPage > 0) {
      txPage--;
      await loadTransactions();
      renderApp();
    }
  });

  document.getElementById('btn-tx-next')?.addEventListener('click', async () => {
    if ((txPage + 1) * TX_PAGE_SIZE < txTotal) {
      txPage++;
      await loadTransactions();
      renderApp();
    }
  });
}

document.addEventListener('DOMContentLoaded', initApp);
