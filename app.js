// ===== CONFIG =====
const SUPABASE_URL = 'https://ezsjldcqgtqtnfyfwtle.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5ixumiz_WwvJdpG_u3RPoA_j8ySwtbo';
const PAYPAL_CLIENT_ID = 'AY6PgnvlAbRHcSgA6sGEo3xdx5v7-7Ln-srrWwBQPcO8C0nwuQzyv2tSaQrncWzjbYAeE1vAPYrgwVEd';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'hype2026';
const MIN_TOPUP = 5;

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== STATE =====
let competitions = [];
let instants = [];
let users = [];
let winners = [];
let isAdmin = false;
let currentUser = null;
let selectedTopupAmount = 10;

// ===== LOAD FROM SUPABASE =====
async function loadAll() {
  const { data: comps } = await sb.from('competitions').select('*').order('created_at', { ascending: false });
  competitions = comps || [];

  const { data: inst } = await sb.from('instants').select('*').order('created_at', { ascending: false });
  instants = inst || [];

  const { data: usrs } = await sb.from('users').select('*');
  users = usrs || [];

  const { data: wins } = await sb.from('winners').select('*').order('created_at', { ascending: false });
  winners = wins || [];

  // Seed if empty
  if (competitions.length === 0) {
    await sb.from('competitions').insert([
      { title: 'Win a 2026 BMW M4', prize_value: 65000, total_tickets: 15000, price: 5.99, sold_percent: 42, end_date: '2026-11-05T23:00:00Z', image: '' },
      { title: 'Rolex Submariner', prize_value: 12000, total_tickets: 2500, price: 7.99, sold_percent: 18, end_date: '2026-11-08T21:00:00Z', image: '' },
      { title: '£50,000 Cash', prize_value: 50000, total_tickets: 100000, price: 0.65, sold_percent: 35, end_date: '2026-11-03T20:00:00Z', image: '' }
    ]);
    await loadAll();
    return;
  }
  if (instants.length === 0) {
    await sb.from('instants').insert([
      { title: 'Mountain Bike', value: 800, image: '' },
      { title: '£500 Cash', value: 500, image: '' },
      { title: 'AirPods Pro', value: 250, image: '' }
    ]);
    await loadAll();
    return;
  }
  renderPublic();
  if (isAdmin) renderAdmin();
}

function calcProfit(c) {
  const revenue = (c.total_tickets || 0) * (c.price || 0);
  const profit = revenue - (c.prize_value || 0);
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
  return { revenue: revenue.toFixed(0), profit: profit.toFixed(0), margin };
}

// ===== RENDER =====
function renderPublic() {
  const grid = document.getElementById('comp-grid');
  if (!grid) return;
  grid.innerHTML = '';
  competitions.forEach(c => {
    const imgSrc = c.image || `https://via.placeholder.com/600x300/161616/ff3c00?text=${encodeURIComponent((c.title || '').slice(0, 18))}`;
    const card = document.createElement('div');
    card.className = 'comp-card';
    card.innerHTML = `
      <img src="${imgSrc}" alt="${c.title}" onerror="this.style.display='none'" />
      <div class="comp-info">
        <h3>${c.title}</h3>
        <div class="price">£${Number(c.price || 0).toFixed(2)}</div>
        <div class="meta"><span>${(c.total_tickets || 0).toLocaleString()} tickets</span><span>${c.sold_percent || 0}% sold</span></div>
        <div class="progress"><div class="progress-bar" data-progress="${c.sold_percent || 0}"></div></div>
        <div class="timer" data-end="${c.end_date}">Loading...</div>
        <button class="btn enter-btn" data-price="${c.price}" data-title="${c.title}" style="width:100%;">Enter now</button>
      </div>
    `;
    grid.appendChild(card);
  });

  const ig = document.getElementById('instant-grid');
  if (ig) {
    ig.innerHTML = '';
    instants.forEach(i => {
      const imgSrc = i.image || `https://via.placeholder.com/600x300/161616/00c853?text=${encodeURIComponent((i.title || '').slice(0, 18))}`;
      const card = document.createElement('div');
      card.className = 'comp-card';
      card.innerHTML = `
        <img src="${imgSrc}" alt="${i.title}" onerror="this.style.display='none'" />
        <div class="comp-info">
          <h3>${i.title}</h3>
          <div class="price" style="color:var(--green)">Instant Win</div>
          <div class="meta"><span>Value: £${i.value || '—'}</span><span>Manual draw</span></div>
          <button class="btn enter-btn" data-price="1.00" data-title="${i.title}" style="width:100%;background:#333">Enter for chance</button>
        </div>
      `;
      ig.appendChild(card);
    });
  }

  const wl = document.getElementById('winners-list');
  if (wl) {
    wl.innerHTML = '';
    winners.slice(0, 6).forEach(w => {
      const d = document.createElement('div');
      d.className = 'winner';
      d.innerHTML = `<div><strong>${w.name}</strong> won ${w.prize}</div><span>${w.ticket || ''} · ${w.date}</span>`;
      wl.appendChild(d);
    });
  }

  setTimeout(() => {
    document.querySelectorAll('.progress-bar').forEach(bar => {
      bar.style.width = (bar.dataset.progress || 0) + '%';
    });
  }, 100);
  updateTimers();
  updateCreditDisplay();
}

function updateTimers() {
  document.querySelectorAll('[data-end]').forEach(el => {
    if (!el.dataset.end) return;
    const end = new Date(el.dataset.end).getTime();
    const diff = end - Date.now();
    if (diff <= 0) { el.textContent = 'Draw soon'; return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    el.textContent = `${d}d ${h}h ${m}m left`;
  });
}
setInterval(updateTimers, 30000);

function updateCreditDisplay() {
  const el = document.getElementById('credit-display');
  if (!el) return;
  if (currentUser) {
    el.textContent = `Credit: £${Number(currentUser.credit || 0).toFixed(2)}`;
  } else {
    el.textContent = 'Credit: £0.00';
  }
}

// ===== ADMIN RENDER =====
function renderAdmin() {
  const list = document.getElementById('admin-comp-list');
  if (list) {
    list.innerHTML = '';
    competitions.forEach(c => {
      const p = calcProfit(c);
      const row = document.createElement('div');
      row.className = 'comp-row';
      row.innerHTML = `
        <div><strong>${c.title}</strong><br><span style="font-size:.85rem;color:var(--muted)">£${Number(c.price||0).toFixed(2)} · ${(c.total_tickets||0).toLocaleString()} · ${c.sold_percent||0}%</span><br><span class="profit">Profit: £${p.profit} (${p.margin}%)</span></div>
        <button class="btn-sm btn-outline" onclick="deleteComp(${c.id})">Delete</button>
      `;
      list.appendChild(row);
    });
  }

  const il = document.getElementById('admin-instant-list');
  if (il) {
    il.innerHTML = '';
    instants.forEach(i => {
      const row = document.createElement('div');
      row.className = 'comp-row';
      row.innerHTML = `
        <div><strong>${i.title}</strong><br><span style="font-size:.85rem;color:var(--muted)">Value: £${i.value || '—'}</span></div>
        <div>
          <button class="btn-sm btn" onclick="pickInstantWinner(${i.id})">Pick Winner</button>
          <button class="btn-sm btn-outline" onclick="deleteInstant(${i.id})" style="margin-left:6px">Delete</button>
        </div>
      `;
      il.appendChild(row);
    });
  }

  const ul = document.getElementById('admin-user-list');
  if (ul) {
    ul.innerHTML = '';
    users.forEach(u => {
      const row = document.createElement('div');
      row.className = 'comp-row';
      row.innerHTML = `
        <div><strong>${u.email}</strong><br><span style="font-size:.85rem">Credit: £${Number(u.credit||0).toFixed(2)}</span></div>
        <button class="btn-sm btn-outline" onclick="addCredit('${u.email}')">+ Credit</button>
      `;
      ul.appendChild(row);
    });
  }
}

async function deleteComp(id) {
  if (!confirm('Delete?')) return;
  await sb.from('competitions').delete().eq('id', id);
  await loadAll();
}
async function deleteInstant(id) {
  if (!confirm('Delete?')) return;
  await sb.from('instants').delete().eq('id', id);
  await loadAll();
}
async function pickInstantWinner(id) {
  const prize = instants.find(i => i.id === id);
  if (!prize) return;
  if (!users.length) { alert('No users to pick from'); return; }
  const email = prompt('Enter winner email (or leave blank for random):', users[0]?.email || '');
  let winner = users.find(u => u.email === email);
  if (!winner) winner = users[Math.floor(Math.random() * users.length)];
  await sb.from('winners').insert({
    name: winner.email.split('@')[0],
    prize: prize.title,
    ticket: 'Manual',
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  });
  alert(`Winner selected: ${winner.email} wins ${prize.title}`);
  await loadAll();
}
async function addCredit(email) {
  const amt = parseFloat(prompt('Add how much credit (£)?', '5'));
  if (!amt) return;
  const u = users.find(x => x.email === email);
  if (u) {
    const newCredit = Number(u.credit || 0) + amt;
    await sb.from('users').update({ credit: newCredit }).eq('email', email);
    await loadAll();
  }
}

// ===== USER ACCOUNT =====
function refreshUserModal() {
  const loginForm = document.getElementById('user-login-form');
  const logged = document.getElementById('user-logged');
  if (!loginForm || !logged) return;
  if (currentUser) {
    loginForm.style.display = 'none';
    logged.style.display = 'block';
    document.getElementById('user-email-display').textContent = currentUser.email;
    document.getElementById('user-credit-display').textContent = '£' + Number(currentUser.credit || 0).toFixed(2);
  } else {
    loginForm.style.display = 'block';
    logged.style.display = 'none';
  }
}

async function userRegister() {
  const email = document.getElementById('u-email').value.trim();
  const pass = document.getElementById('u-pass').value;
  if (!email || !pass) return alert('Enter email and password');
  const { data: existing } = await sb.from('users').select('id').eq('email', email).maybeSingle();
  if (existing) return alert('Email already registered');
  const { data, error } = await sb.from('users').insert({ email, password: pass, credit: 0 }).select().single();
  if (error) return alert('Registration failed: ' + error.message);
  currentUser = data;
  localStorage.setItem('hype_current_email', email);
  refreshUserModal(); updateCreditDisplay();
  await loadAll();
  alert('Registered! You can now top up credit and enter competitions.');
}

async function userLogin() {
  const email = document.getElementById('u-email').value.trim();
  const pass = document.getElementById('u-pass').value;
  const { data, error } = await sb.from('users').select('*').eq('email', email).eq('password', pass).maybeSingle();
  if (!data || error) return alert('Invalid login');
  currentUser = data;
  localStorage.setItem('hype_current_email', email);
  refreshUserModal(); updateCreditDisplay();
}

function userLogout() {
  currentUser = null;
  localStorage.removeItem('hype_current_email');
  refreshUserModal(); updateCreditDisplay();
}

// ===== TOP UP =====
function selectTopup(amount) {
  selectedTopupAmount = amount;
  document.querySelectorAll('.topup-options button').forEach(b => {
    b.classList.remove('btn');
    b.classList.add('btn-outline');
  });
  const active = document.querySelector(`.topup-options button[data-amount="${amount}"]`);
  if (active) { active.classList.remove('btn-outline'); active.classList.add('btn'); }
  document.getElementById('custom-amount').value = amount === 'custom' ? '' : amount;
  renderPayPalButton();
}

function renderPayPalButton() {
  const container = document.getElementById('paypal-button-container');
  if (!container) return;
  container.innerHTML = '';
  if (typeof paypal === 'undefined') {
    container.innerHTML = '<p style="color:#f66;font-size:0.85rem;">PayPal not loaded.</p>';
    return;
  }
  const amount = selectedTopupAmount === 'custom'
    ? parseFloat(document.getElementById('custom-amount').value) || 0
    : selectedTopupAmount;
  if (amount < MIN_TOPUP) {
    container.innerHTML = `<p style="color:#f66;font-size:0.85rem;">Minimum top-up is £${MIN_TOPUP}</p>`;
    return;
  }
  paypal.Buttons({
    createOrder: (data, actions) => {
      return actions.order.create({
        purchase_units: [{
          amount: { value: amount.toFixed(2), currency_code: 'GBP' },
          description: 'Hype Competitions site credit top-up'
        }]
      });
    },
    onApprove: async (data, actions) => {
      return actions.order.capture().then(async details => {
        if (currentUser) {
          const newCredit = Number(currentUser.credit || 0) + amount;
          await sb.from('users').update({ credit: newCredit }).eq('email', currentUser.email);
          currentUser.credit = newCredit;
          updateCreditDisplay();
          alert(`Success! £${amount.toFixed(2)} added to your credit.`);
          document.getElementById('topup-modal').classList.remove('show');
          await loadAll();
        }
      });
    },
    onError: err => {
      alert('Payment error. Please try again.');
      console.error(err);
    }
  }).render('#paypal-button-container');
}

// ===== EVENTS =====
document.addEventListener('DOMContentLoaded', async () => {
  // Restore session
  const savedEmail = localStorage.getItem('hype_current_email');
  if (savedEmail) {
    const { data } = await sb.from('users').select('*').eq('email', savedEmail).maybeSingle();
    if (data) currentUser = data;
  }

  await loadAll();

  const logo = document.getElementById('logo-img');
  if (logo) {
    logo.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#111"/><text x="50" y="62" font-size="36" font-weight="800" text-anchor="middle" fill="#ff3c00">HC</text></svg>');
  }

  document.getElementById('user-btn')?.addEventListener('click', () => {
    document.getElementById('user-modal').classList.add('show');
    refreshUserModal();
  });
  document.getElementById('close-user')?.addEventListener('click', () => {
    document.getElementById('user-modal').classList.remove('show');
  });

  document.getElementById('topup-btn')?.addEventListener('click', () => {
    if (!currentUser) { alert('Please create an account first.'); document.getElementById('user-modal').classList.add('show'); return; }
    document.getElementById('topup-modal').classList.add('show');
    selectTopup(10);
  });
  document.getElementById('close-topup')?.addEventListener('click', () => {
    document.getElementById('topup-modal').classList.remove('show');
  });

  document.getElementById('custom-amount')?.addEventListener('input', () => {
    const val = parseFloat(document.getElementById('custom-amount').value);
    if (val >= MIN_TOPUP) {
      selectedTopupAmount = val;
      renderPayPalButton();
    }
  });

  document.addEventListener('click', async e => {
    if (e.target.classList.contains('enter-btn')) {
      if (!currentUser) { alert('Please create an account first.'); document.getElementById('user-modal').classList.add('show'); return; }
      const price = parseFloat(e.target.dataset.price) || 1;
      const title = e.target.dataset.title || 'competition';
      if (Number(currentUser.credit || 0) < price) {
        alert(`Not enough credit. You need £${price.toFixed(2)}. Top up first.`);
        document.getElementById('topup-modal').classList.add('show');
        return;
      }
      if (confirm(`Spend £${price.toFixed(2)} credit to enter "${title}"?`)) {
        const newCredit = Number(currentUser.credit || 0) - price;
        await sb.from('users').update({ credit: newCredit }).eq('email', currentUser.email);
        currentUser.credit = newCredit;
        updateCreditDisplay();
        alert(`Entered! Your ticket is confirmed. Credit remaining: £${newCredit.toFixed(2)}`);
        await loadAll();
      }
    }
  });

  document.getElementById('admin-login-btn')?.addEventListener('click', () => {
    if (isAdmin) document.getElementById('admin-panel').classList.toggle('show');
    else document.getElementById('login-modal').classList.add('show');
  });
  document.getElementById('close-login')?.addEventListener('click', () => {
    document.getElementById('login-modal').classList.remove('show');
  });
  document.getElementById('do-login')?.addEventListener('click', () => {
    const u = document.getElementById('login-user').value;
    const p = document.getElementById('login-pass').value;
    if (u === ADMIN_USER && p === ADMIN_PASS) {
      isAdmin = true;
      document.getElementById('login-modal').classList.remove('show');
      document.getElementById('admin-panel').classList.add('show');
      renderAdmin();
    } else alert('Wrong credentials');
  });

  document.getElementById('comp-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    await sb.from('competitions').insert({
      title: document.getElementById('c-title').value.trim(),
      prize_value: parseFloat(document.getElementById('c-prize').value),
      total_tickets: parseInt(document.getElementById('c-tickets').value),
      price: parseFloat(document.getElementById('c-price').value),
      sold_percent: parseInt(document.getElementById('c-sold').value) || 0,
      end_date: document.getElementById('c-end').value,
      image: document.getElementById('c-image').value.trim()
    });
    e.target.reset();
    await loadAll();
  });

  document.getElementById('instant-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    await sb.from('instants').insert({
      title: document.getElementById('i-title').value.trim(),
      value: parseFloat(document.getElementById('i-value').value) || 0,
      image: document.getElementById('i-image').value.trim()
    });
    e.target.reset();
    await loadAll();
  });

  document.getElementById('draw-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('d-amount').value);
    const count = parseInt(document.getElementById('d-count').value);
    if (!users.length) { alert('No users registered yet'); return; }
    for (let i = 0; i < count; i++) {
      const winner = users[Math.floor(Math.random() * users.length)];
      const newCredit = Number(winner.credit || 0) + amount;
      await sb.from('users').update({ credit: newCredit }).eq('id', winner.id);
      await sb.from('winners').insert({
        name: winner.email.split('@')[0],
        prize: `£${amount} Credit`,
        ticket: 'Auto',
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      });
    }
    alert(`Awarded £${amount} credit to ${count} random users`);
    await loadAll();
  });

  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      ['comps', 'instant', 'draws', 'users'].forEach(id => {
        const el = document.getElementById('tab-' + id);
        if (el) el.style.display = (t.dataset.tab === id) ? 'block' : 'none';
      });
    });
  });

  ['c-prize', 'c-tickets', 'c-price'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateProfitPreview);
  });
});

function updateProfitPreview() {
  const prize = parseFloat(document.getElementById('c-prize')?.value) || 0;
  const tickets = parseInt(document.getElementById('c-tickets')?.value) || 0;
  const price = parseFloat(document.getElementById('c-price')?.value) || 0;
  const el = document.getElementById('profit-preview');
  if (!el) return;
  if (prize && tickets && price) {
    const rev = tickets * price;
    const profit = rev - prize;
    const margin = ((profit / rev) * 100).toFixed(1);
    el.innerHTML = `Preview: Revenue £${rev.toFixed(0)} · Profit £${profit.toFixed(0)} · Margin ${margin}%`;
    el.style.color = profit > 0 ? 'var(--green)' : '#f66';
  } else el.innerHTML = '';
}

window.deleteComp = deleteComp;
window.deleteInstant = deleteInstant;
window.pickInstantWinner = pickInstantWinner;
window.addCredit = addCredit;
window.userRegister = userRegister;
window.userLogin = userLogin;
window.userLogout = userLogout;
window.selectTopup = selectTopup;
window.logout = () => { isAdmin = false; document.getElementById('admin-panel')?.classList.remove('show'); };
