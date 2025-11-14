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

// ------- Dashboard rendering -------
function renderDashboard() {
  const totalIncomeEl = document.getElementById('totalIncome');
  const saldoPengeluaranEl = document.getElementById('saldoPengeluaran');
  const saldoTabunganEl = document.getElementById('saldoTabungan');
  const recentList = document.getElementById('recentList');

  if (!totalIncomeEl) return; // berarti bukan di dashboard.html

  const totalIncome = state.income.reduce((sum, it) => sum + it.amount, 0);

  totalIncomeEl.textContent = formatRp(totalIncome);
  saldoPengeluaranEl.textContent = formatRp(state.saldoPengeluaran);
  saldoTabunganEl.textContent = formatRp(state.saldoTabungan);

  recentList.innerHTML = '';
  const combined = [
    ...state.income.map(i => ({ ...i, txType: 'income' })),
    ...state.expense.map(e => ({ ...e, txType: 'expense' }))
  ].sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  if (combined.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Belum ada transaksi.';
    recentList.appendChild(li);
    return;
  }

  combined.forEach(tx => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.className = 'tx-label';
    const title = document.createElement('span');
    title.textContent = tx.txType === 'income' ? (tx.source || 'Penghasilan') : (tx.category || 'Pengeluaran');
    const date = document.createElement('span');
    date.style.color = '#9ca3af';
    date.style.fontSize = '0.75rem';
    date.textContent = tx.date || '';
    left.appendChild(title);
    left.appendChild(date);

    const right = document.createElement('span');
    right.textContent = (tx.txType === 'income' ? '+' : '-') + formatRp(tx.amount).replace('Rp ', ' ');
    right.className = tx.txType === 'income' ? 'tx-type-income' : 'tx-type-expense';

    li.appendChild(left);
    li.appendChild(right);
    recentList.appendChild(li);
  });
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
    title.textContent = tx.txType === 'income' ? (tx.source || 'Penghasilan') : (tx.category || 'Pengeluaran');
    const date = document.createElement('span');
    date.style.color = '#9ca3af';
    date.style.fontSize = '0.75rem';
    date.textContent = tx.date || '';
    left.appendChild(title);
    left.appendChild(date);

    const right = document.createElement('span');
    right.textContent = (tx.txType === 'income' ? '+' : '-') + formatRp(tx.amount).replace('Rp ', ' ');
    right.className = tx.txType === 'income' ? 'tx-type-income' : 'tx-type-expense';

    li.appendChild(left);
    li.appendChild(right);
    listEl.appendChild(li);
  });
}

// ------- Tabs logic on transaksi.html -------
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  if (!tabButtons.length) return;

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('tab-active'));
      btn.classList.add('tab-active');

      const target = btn.dataset.tab;
      panels.forEach(p => {
        if (p.id === 'tab-' + target) {
          p.classList.add('tab-panel-active');
        } else {
          p.classList.remove('tab-panel-active');
        }
      });
    });
  });
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
    preview.textContent = `30% ke Pengeluaran: ${formatRp(p30)} • 70% ke Tabungan: ${formatRp(p70)}`;
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

    alert(`Penghasilan disimpan.
30%: ${formatRp(p30)} ke Pengeluaran
70%: ${formatRp(p70)} ke Tabungan`);

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
    preview.textContent = `Saldo pengeluaran sebelum: ${formatRp(before)} • setelah: ${formatRp(after)}`;
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

// ------ clear button riwayat pemasukan dan pemasukan ------

function clearHistoryWithConfirm() {
  const btn = document.getElementById('btnClearHistory');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!state.income.length && !state.expense.length) {
      alert('Belum ada riwayat untuk dihapus.');
      return;
    }

    const ok = confirm(
      'Yakin ingin menghapus SEMUA riwayat pemasukan dan pengeluaran?

' +
      '• Saldo pengeluaran akan di-reset ke 0
' +
      '• Saldo tabungan akan di-reset ke 0
' +
      '• Semua transaksi akan hilang

' +
      'Tindakan ini tidak bisa dibatalkan.'
    );
    if (!ok) return;

    state.saldoPengeluaran = 0;
    state.saldoTabungan = 0;
    state.income = [];
    state.expense = [];
    saveState();

    renderDashboard();
    renderTxList();

    alert('Semua riwayat berhasil dihapus dan saldo di-reset ke 0.');
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
  setupIncomeForm();
  setupExpenseForm();
  clearHistoryWithConfirm();
  registerSW();
});