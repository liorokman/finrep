import Chart from 'chart.js/auto';

let donutChartInstance: Chart | null = null;
let cashFlowChartInstance: Chart | null = null;
let netWorthChartInstance: Chart | null = null;
let ccPayoffChartInstance: Chart | null = null;

export function renderCategoryDonutChart(canvasId: string, items: { category_name: string; total_amount: number; color_hex: string }[]) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return;

  if (donutChartInstance) {
    donutChartInstance.destroy();
  }

  const labels = items.map(i => i.category_name);
  const data = items.map(i => i.total_amount);
  const colors = items.map(i => i.color_hex || '#3B82F6');

  donutChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels.length > 0 ? labels : ['No Expenses Yet'],
      datasets: [{
        data: data.length > 0 ? data : [1],
        backgroundColor: colors.length > 0 ? colors : ['#334155'],
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            font: { size: 11 }
          }
        }
      },
      cutout: '70%',
    }
  });
}

export function renderCashFlowChart(canvasId: string, items: { month: string; income: number; expenses: number }[]) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return;

  if (cashFlowChartInstance) {
    cashFlowChartInstance.destroy();
  }

  const months = items.map(i => i.month);
  const incomeData = items.map(i => i.income);
  const expenseData = items.map(i => i.expenses);

  cashFlowChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: months.length > 0 ? months : ['Current Month'],
      datasets: [
        {
          label: 'Income (₪)',
          data: incomeData.length > 0 ? incomeData : [0],
          backgroundColor: '#10B981',
          borderRadius: 6,
        },
        {
          label: 'Expenses (₪)',
          data: expenseData.length > 0 ? expenseData : [0],
          backgroundColor: '#F43F5E',
          borderRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#1e293b' }
        },
        y: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#1e293b' }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#94a3b8' }
        }
      }
    }
  });
}

export function renderNetWorthChart(canvasId: string, items: { date: string; total_assets: number; total_liabilities: number; net_worth: number }[]) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return;

  if (netWorthChartInstance) {
    netWorthChartInstance.destroy();
  }

  const dates = items.map(i => i.date);
  const netWorthValues = items.map(i => i.net_worth);

  netWorthChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: dates.length > 0 ? dates : ['Today'],
      datasets: [{
        label: 'Net Worth (₪)',
        data: netWorthValues.length > 0 ? netWorthValues : [0],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#1e293b' }
        },
        y: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#1e293b' }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#94a3b8' }
        }
      }
    }
  });
}

export function renderCCPayoffChart(canvasId: string, items: { month: string; installment_cost: number }[]) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return;

  if (ccPayoffChartInstance) {
    ccPayoffChartInstance.destroy();
  }

  const months = items.map(i => i.month);
  const costs = items.map(i => i.installment_cost);

  ccPayoffChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: months.length > 0 ? months : ['No Installments'],
      datasets: [{
        label: 'Future Installments (₪)',
        data: costs.length > 0 ? costs : [0],
        backgroundColor: '#8B5CF6',
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#1e293b' }
        },
        y: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#1e293b' }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#94a3b8' }
        }
      }
    }
  });
}
