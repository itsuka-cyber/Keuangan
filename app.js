// ------- State & storage -------
const STORAGE_KEY = 'keuangan3070_state';

let state = {
  saldoPengeluaran: 0,
  saldoTabungan: 0,
  income: [],
  expense: []
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (typeof obj.saldoPengeluaran === 'number') state.saldoPengeluaran = obj.saldoPengeluaran;
    if (typeof obj.saldoTabungan === 'number') state.saldoTabungan = obj.saldoTabungan;
    if (Array.isArray(obj.income)) state.income = obj.income;
    if (Array.isArray(obj.expense)) state.expense = obj.expense;
  } catch (e) {
    console.error('Failed to load state', e);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatRp(num) {
  return 'Rp ' + (num || 0).toLocaleString('id-ID');
}

// ------- Dashboard bars & tabs -------
function updateDashboardBarsAndMirror() {
  const saldoPElTop = document.getElementById('saldoPengeluaranTop');
  const saldoTElTop = document.getElementById('saldoTabunganTop');
  const barExpense = document.getElementById('barExpense');
  const barSaving = document.getElementById('barSaving');
  const totalIncomeEl = document.getElementById('totalIncome');

  if (!totalIncomeEl) return; // bukan di dashboard

  const totalIncome = state.income.reduce((sum, it) => sum + it.amount, 0);
  totalIncomeEl.textContent = formatRp(totalIncome);

  if (saldoPElTop) saldoPElTop.textContent = formatRp(state.saldoPengeluaran);
  if (saldoTElTop) saldoTElTop.textContent = formatRp(state.saldoTabungan);

  const theoretical30 = Math.round(totalIncome * 0.3);
  const theoretical70 = totalIncome - theoretical30;

  const expRatio = theoretical30 ? Math.min(100, (state.saldoPengeluaran / theoretical30) * 100) : 0;
  const savRatio = theoretical70 ? Math.min(100, (state.saldoTabungan / theoretical70) * 100) : 0;

  if (barExpense) barExpense.style.width = expRatio + '%';
  if (barSaving) barSaving.style.width = savRatio + '%';
}

function setupDashboardTabsAndBars() {
  const tabBtns = document.querySelectorAll('.panel-tab-btn');
  const tabs = {
    overview: document.getElementById('panel-overview'),
    budget: document.getElementById('panel-budget'),
    transactions: document.getElementById('panel-transactions')
  };
  if (!tabBtns.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('panel-tab-active'));
      btn.classList.add('panel-tab-active');

      const key = btn.dataset.tab;
      Object.keys(tabs).forEach(k => {
        if (tabs[k]) {
          if (k === key) tabs[k].classList.add('panel-tab-show');
          else tabs[k].classList.remove('panel-tab-show');
        }
      });
    });
  });
}

// ------- Dashboard rendering -------
function renderDashboard() {
  const totalIncomeEl = document.getElementById('totalIncome');
  const saldoPengeluaranEl = document.getElementById('saldoPengeluaran');
  const saldoTabunganEl = document.getElementById('saldoTabungan');
  const recentList = document.getElementById('recentList');
  const recentListPanel = document.getElementById('recentListPanel');

  if (!totalIncomeEl && !recentList && !recentListPanel && !saldoPengeluaranEl && !saldoTabunganEl) {
    return; // bukan di dashboard
  }

  const totalIncome = state.income.reduce((sum, it) => sum + it.amount, 0);

  if (saldoPengeluaranEl) saldoPengeluaranEl.textContent = formatRp(state.saldoPengeluaran);
  if (saldoTabunganEl) saldoTabunganEl.textContent = formatRp(state.saldoTabungan);
  if (totalIncomeEl) totalIncomeEl.textContent = formatRp(totalIncome);

  const combined = [
    ...state.income.map(i => ({ ...i, txType: 'income' })),
    ...state.expense.map(e => ({ ...e, txType: 'expense' }))
  ].sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  function renderList(target) {
    if (!target) return;
    target.innerHTML = '';
    if (combined.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Belum ada transaksi.';
      target.appendChild(li);
      return;
    }
    combined.forEach(tx => {
      const li = document.createElement('li');
      const left = document.createElement('div');
      left.className = 'tx-label';
      const title = document.createElement('span');
      title.textContent = tx.txType === 'income'
        ? (tx.source || 'Penghasilan')
        : (tx.category || 'Pengeluaran');
      const date = document.createElement('span');
      date.style.color = '#9ca3af';
      date.style.fontSize = '0.75rem';
      date.textContent = tx.date || '';
      left.appendChild(title);
      left.appendChild(date);

      const right = document.createElement('span');
      right.textContent =
        (tx.txType === 'income' ? '+' : '-') +
        formatRp(tx.amount).replace('Rp ', ' ');
      right.className = tx.txType === 'income'
        ? 'tx-type-income'
        : 'tx-type-expense';

      li.appendChild(left);
      li.appendChild(right);
      target.appendChild(li);
    });
  }

  renderList(recentList);
  renderList(recentListPanel);
  updateDashboardBarsAndMirror();
}

// ------- Delete transaction helper -------
function deleteTransactionById(txId, txType) {
  if (txType === 'income') {
    const idx = state.income.findIndex(i => i.id === txId);
    if (idx === -1) return;

    const tx = state.income[idx];
    const amount = tx.amount;
    const p30 = Math.round(amount * 0.3);
    const p70 = amount - p30;

    state.saldoPengeluaran = Math.max(0, state.saldoPengeluaran - p30);
    state.saldoTabungan = Math.max(0, state.saldoTabungan - p70);

    state.income.splice(idx, 1);
  } else if (txType === 'expense') {
    const idx = state.expense.findIndex(e => e.id === txId);
    if (idx === -1) return;

    const tx = state.expense[idx];
    const amount = tx.amount;

    state.saldoPengeluaran += amount;

    state.expense.splice(idx, 1);
  }

  saveState();
  renderDashboard();
  renderTxList();
}

// ------- Transaksi rendering -------
function renderTxList() {
  const listEl = document.getElementById('txList');
  if (!listEl) return;

  listEl.innerHTML = '';
  const combined = [
    ...state.income.map(i => ({ ...i, txType: 'income' })),
    ...state.expense.map(e => ({ ...e, txType: 'expense' }))
  ].sort((a, b) => b.createdAt - a.createdAt);

  if (combined.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Belum ada transaksi.';
    listEl.appendChild(li);
    return;
  }

  combined.forEach(tx => {
    const li = document.createElement('li');

    const left = document.createElement('div');
    left.className = 'tx-label';
    const title = document.createElement('span');
    title.textContent = tx.txType === 'income'
      ? (tx.source || 'Penghasilan')
      : (tx.category || 'Pengeluaran');
    const date = document.createElement('span');
    date.style.color = '#9ca3af';
    date.style.fontSize = '0.75rem';
    date.textContent = tx.date || '';
    left.appendChild(title);
    left.appendChild(date);

    const rightWrap = document.createElement('div');
    rightWrap.className = 'tx-actions';

    const amountSpan = document.createElement('span');
    amountSpan.textContent =
      (tx.txType === 'income' ? '+' : '-') +
      formatRp(tx.amount).replace('Rp ', ' ');
    amountSpan.className = tx.txType === 'income'
      ? 'tx-type-income'
      : 'tx-type-expense';

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-icon-danger';
    delBtn.textContent = 'Hapus';

    delBtn.addEventListener('click', () => {
      const ok = confirm(
        `Hapus transaksi ini?

` +
        `${tx.txType === 'income' ? 'Penghasilan' : 'Pengeluaran'} ` +
        `${formatRp(tx.amount)} pada ${tx.date || '-'}
` +
        `Tindakan ini akan menyesuaikan saldo 30/70.`
      );
      if (!ok) return;
      deleteTransactionById(tx.id, tx.txType);
    });

    rightWrap.appendChild(amountSpan);
    rightWrap.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(rightWrap);
    listEl.appendChild(li);
  });
}

// ------- Tabs transaksi -------
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  if (!tabButtons.length) return;

  function activate(tabKey) {
    tabButtons.forEach(b => {
      b.classList.toggle('tab-active', b.dataset.tab === tabKey);
    });
    panels.forEach(p => {
      p.classList.toggle('tab-panel-active', p.id === 'tab-' + tabKey);
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      activate(btn.dataset.tab);
    });
  });

  // jika URL mengandung #expense, langsung buka tab Pengeluaran
  if (location.hash === '#expense') {
    activate('expense');
  } else {
    activate('income');
  }
}

// ------- Forms logic -------
function setupIncomeForm() {
  const form = document.getElementById('formIncome');
  if (!form) return;

  const amountInput = document.getElementById('incomeAmount');
  const sourceInput = document.getElementById('incomeSource');
  const dateInput = document.getElementById('incomeDate');
  const preview = document.getElementById('incomePreview');

  if (dateInput && !dateInput.value) {
    dateInput.valueAsNumber = Date.now() - (new Date().getTimezoneOffset() * 60000);
  }

  function updatePreview() {
    const val = Number(amountInput.value || 0);
    const p30 = Math.round(val * 0.3);
    const p70 = val - p30;
    preview.textContent =
      `30% ke Pengeluaran: ${formatRp(p30)} • 70% ke Tabungan: ${formatRp(p70)}`;
  }

  amountInput.addEventListener('input', updatePreview);
  updatePreview();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = Number(amountInput.value);
    if (!amount || amount <= 0) return;

    const p30 = Math.round(amount * 0.3);
    const p70 = amount - p30;

    state.saldoPengeluaran += p30;
    state.saldoTabungan += p70;

    state.income.push({
      id: 'inc_' + Date.now(),
      amount,
      source: sourceInput.value.trim() || 'Penghasilan',
      date: dateInput.value,
      createdAt: Date.now()
    });

    saveState();
    amountInput.value = '';
    sourceInput.value = '';
    updatePreview();

    alert(
      `Penghasilan disimpan.
` +
      `30%: ${formatRp(p30)} ke Pengeluaran
` +
      `70%: ${formatRp(p70)} ke Tabungan`
    );

    renderDashboard();
    renderTxList();
  });
}

function setupExpenseForm() {
  const form = document.getElementById('formExpense');
  if (!form) return;

  const amountInput = document.getElementById('expenseAmount');
  const categoryInput = document.getElementById('expenseCategory');
  const dateInput = document.getElementById('expenseDate');
  const preview = document.getElementById('expensePreview');

  if (dateInput && !dateInput.value) {
    dateInput.valueAsNumber = Date.now() - (new Date().getTimezoneOffset() * 60000);
  }

  function updatePreview() {
    const val = Number(amountInput.value || 0);
    const before = state.saldoPengeluaran;
    const after = before - val;
    preview.textContent =
      `Saldo pengeluaran sebelum: ${formatRp(before)} • setelah: ${formatRp(after)}`;
  }

  amountInput.addEventListener('input', updatePreview);
  updatePreview();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = Number(amountInput.value);
    if (!amount || amount <= 0) return;

    if (amount > state.saldoPengeluaran) {
      const useSaving = confirm(
        `Saldo pengeluaran tidak cukup.
` +
        `Pengeluaran: ${formatRp(amount)}
` +
        `Saldo pengeluaran: ${formatRp(state.saldoPengeluaran)}

` +
        `Apakah mau memakai Tabungan untuk menutup kekurangan?`
      );
      if (!useSaving) return;

      const diff = amount - state.saldoPengeluaran;
      state.saldoPengeluaran = 0;
      state.saldoTabungan = Math.max(0, state.saldoTabungan - diff);
    } else {
      state.saldoPengeluaran -= amount;
    }

    state.expense.push({
      id: 'exp_' + Date.now(),
      amount,
      category: categoryInput.value.trim() || 'Pengeluaran',
      date: dateInput.value,
      createdAt: Date.now()
    });

    saveState();
    amountInput.value = '';
    categoryInput.value = '';
    updatePreview();

    alert('Pengeluaran disimpan.');

    renderDashboard();
    renderTxList();
  });
}

// ------- PWA: service worker register -------
function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.error('SW registration failed', err);
      });
    });
  }
}

// ------- Init -------
loadState();
document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  renderTxList();
  setupTabs();
  setupDashboardTabsAndBars();
  setupIncomeForm();
  setupExpenseForm();
  registerSW();
});