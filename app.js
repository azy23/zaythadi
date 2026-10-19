(() => {
  'use strict';
  const cfg = window.ZAYTHADI_CONFIG || {};
  const endpoint = `${String(cfg.supabaseUrl || '').replace(/\/$/, '')}/rest/v1/${cfg.table || 'price_reports'}`;
  const key = cfg.supabaseKey || '';
  const $ = id => document.getElementById(id);
  const state = { reports: [], status: '', page: 1, pageSize: 12, township: '' };
  const labels = { rise: 'ဈေးတက်', fall: 'ဈေးကျ', stable: 'ဈေးတည်ငြိမ်', shortage: 'ပစ္စည်းရှား' };
  const icons = { rise: '↗', fall: '↘', stable: '✓', shortage: '!' };
  const productIcons = { 'ဆန်':'🍚','ဆီ':'🫗','ကြက်ဥ':'🥚','ကြက်သား':'🍗','ဝက်သား':'🥩','အမဲသား':'🥩','ကြက်သွန်နီ':'🧅','ကြက်သွန်ဖြူ':'🧄','အာလူး':'🥔','ဆား':'🧂','သောက်ရေ':'💧','ဓာတ်ဆီ':'⛽' };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatPrice = value => value === null || value === undefined || value === '' ? '' : new Intl.NumberFormat('my-MM', { maximumFractionDigits: 2 }).format(Number(value));
  const when = value => { if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; return new Intl.DateTimeFormat('my-MM', { dateStyle: 'medium', timeStyle: 'short' }).format(date); };
  const headers = () => ({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' });
  function setMessage(message, type = '') { const el = $('form-message'); el.textContent = message; el.className = `form-message ${type}`.trim(); }
  function setDataNote(text) { $('data-note').innerHTML = `<span class="note-dot"></span> ${escapeHtml(text)}`; }
  function reportStatus(report) { return labels[report.status] || 'အခြေအနေ မသတ်မှတ်ရသေး'; }
  function reportCard(report) {
    const status = ['rise','fall','stable','shortage'].includes(report.status) ? report.status : 'stable';
    const name = escapeHtml(report.product || 'ပစ္စည်းအမည် မသိ');
    const place = [report.township, report.market_location].filter(Boolean).map(escapeHtml).join(' · ');
    const price = formatPrice(report.price);
    const unit = report.unit ? ` / ${escapeHtml(report.unit)}` : '';
    return `<article class="report-card"><div class="product-icon" aria-hidden="true">${productIcons[report.product] || '🛍️'}</div><div class="report-main"><div class="report-title">${name}</div><div class="report-meta">${place || 'မြို့နယ် မဖော်ပြထား'}${report.created_at ? ` · ${escapeHtml(when(report.created_at))}` : ''}</div>${report.note ? `<div class="report-note">${escapeHtml(report.note)}</div>` : ''}<span class="status-pill pill-${status}">${icons[status]} ${reportStatus(report)}</span></div><div class="report-price">${price ? `<strong>${escapeHtml(price)}</strong><small>${unit || 'ကျပ်'}</small>` : `<small>ဈေးနှုန်း မဖော်ပြထား</small>`}</div></article>`;
  }
  function visibleReports() {
    return state.reports.filter(r => (!state.township || r.township === state.township) && (!state.status || r.status === state.status));
  }
  function renderReports() {
    const list = visibleReports();
    const shown = list.slice(0, state.page * state.pageSize);
    $('reports-list').innerHTML = shown.length ? shown.map(reportCard).join('') : `<div class="empty-state"><div style="font-size:30px">🧺</div><p>ဒီရွေးချယ်မှုအတွက် တင်ပြချက် မရှိသေးပါ။</p><p>သင်သိတဲ့ ဈေးနှုန်းကို အရင်ဆုံး မျှဝေနိုင်ပါတယ်။</p></div>`;
    $('load-more').hidden = shown.length >= list.length;
    $('clear-filter').hidden = !state.status;
    if (state.status) $('latest-heading').textContent = `${labels[state.status]} တင်ပြချက်များ`;
    else $('latest-heading').textContent = 'နောက်ဆုံး ဈေးနှုန်းတင်ပြချက်များ';
  }
  function renderCounts() {
    const list = state.reports.filter(r => !state.township || r.township === state.township);
    for (const status of Object.keys(labels)) $(status === 'rise' ? 'rise-count' : status === 'fall' ? 'fall-count' : status === 'stable' ? 'stable-count' : 'shortage-count').textContent = new Intl.NumberFormat('my-MM').format(list.filter(r => r.status === status).length);
  }
  function fillTownships() {
    const select = $('township'); const current = select.value;
    const towns = [...new Set(state.reports.map(r => r.township).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'my'));
    select.innerHTML = '<option value="">မြို့နယ်အားလုံး</option>' + towns.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    if (towns.includes(current)) select.value = current;
  }
  async function loadReports() {
    if (!cfg.supabaseUrl || !key || key.includes('REPLACE_ME')) {
      setDataNote('Supabase public key ကို config.js တွင် စစ်ဆေးပါ။');
      $('reports-list').innerHTML = '<div class="empty-state"><p>Database ချိတ်ဆက်မှုအတွက် config.js ကို စစ်ဆေးရန် လိုအပ်ပါတယ်။</p></div>';
      return;
    }
    setDataNote('ဈေးနှုန်းအချက်အလက်များ ရယူနေပါတယ်…');
    try {
      const url = `${endpoint}?select=id,township,product,status,price,unit,market_location,note,created_at&order=created_at.desc&limit=500`;
      const response = await fetch(url, { headers: headers() });
      if (!response.ok) throw new Error(`Database response ${response.status}`);
      state.reports = await response.json();
      fillTownships(); renderCounts(); renderReports();
      setDataNote(state.reports.length ? `နောက်ဆုံးတင်ပြချက် ${new Intl.NumberFormat('my-MM').format(state.reports.length)} ခု · အသုံးပြုသူတင်ပြထားသော ဒေတာ` : 'တင်ပြချက်အသစ် မရှိသေးပါ။ ပထမဆုံး မျှဝေသူ ဖြစ်နိုင်ပါတယ်။');
    } catch (error) {
      console.error('Unable to load reports:', error);
      setDataNote('ဈေးနှုန်းများကို လက်ရှိ မရယူနိုင်သေးပါ။ အင်တာနက်နှင့် Supabase public key ကို စစ်ဆေးပါ။');
      $('reports-list').innerHTML = '<div class="empty-state"><p>အချက်အလက် ရယူရာမှာ အခက်အခဲရှိနေပါတယ်။</p><p>ခဏအကြာတွင် ပြန်စမ်းကြည့်ပါ။</p></div>';
    }
  }
  $('township').addEventListener('change', e => { state.township = e.target.value; state.page = 1; renderCounts(); renderReports(); });
  document.querySelectorAll('.status-card').forEach(card => card.addEventListener('click', () => { state.status = state.status === card.dataset.status ? '' : card.dataset.status; state.page = 1; renderReports(); $('latest-section').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  $('clear-filter').addEventListener('click', () => { state.status = ''; state.page = 1; renderReports(); });
  $('load-more').addEventListener('click', () => { state.page += 1; renderReports(); });
  $('refresh-button').addEventListener('click', loadReports);
  $('product').addEventListener('change', () => { const other = $('product').value === 'other'; $('other-product-wrap').hidden = !other; $('other-product').required = other; });
  $('price-form').addEventListener('submit', async event => {
    event.preventDefault();
    const township = $('report-township').value.trim();
    const selectedProduct = $('product').value;
    const product = selectedProduct === 'other' ? $('other-product').value.trim() : selectedProduct;
    const statusInput = document.querySelector('input[name="status"]:checked');
    const priceRaw = $('price').value.trim();
    if (!township || !product || !statusInput) { setMessage('မြို့နယ်၊ ပစ္စည်းနဲ့ ဈေးကွက်အခြေအနေကို ဖြည့်/ရွေးပေးပါ။', 'error'); return; }
    if (priceRaw && (!Number.isFinite(Number(priceRaw)) || Number(priceRaw) < 0)) { setMessage('ဈေးနှုန်းကို မှန်ကန်စွာ ဖြည့်ပေးပါ။', 'error'); return; }
    if (!key) { setMessage('Database key ကို config.js တွင် စစ်ဆေးရန် လိုအပ်ပါတယ်။', 'error'); return; }
    const payload = { township, product, status: statusInput.value, price: priceRaw ? Number(priceRaw) : null, unit: $('unit').value || null, market_location: $('market-location').value.trim() || null, note: $('note').value.trim() || null };
    const button = $('submit-button'); button.disabled = true; button.textContent = 'တင်ပြနေပါတယ်…'; setMessage('');
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
      if (!response.ok) { let detail = ''; try { detail = (await response.json()).message || ''; } catch (_) {} throw new Error(detail || `Database response ${response.status}`); }
      $('price-form').reset(); $('other-product-wrap').hidden = true; $('other-product').required = false;
      setMessage('ကျေးဇူးတင်ပါတယ်။ သင့်တင်ပြချက်ကို မျှဝေပြီးပါပြီ။', 'success');
      state.status = ''; state.page = 1; await loadReports(); $('latest-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      console.error('Unable to submit report:', error);
      setMessage('တင်ပြမှု မအောင်မြင်ပါ။ အင်တာနက်၊ public key နဲ့ Database policy ကို စစ်ဆေးပြီး ထပ်စမ်းပါ။', 'error');
    } finally { button.disabled = false; button.innerHTML = 'ဈေးနှုန်းတင်ပြမယ် <span aria-hidden="true">→</span>'; }
  });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(err => console.info('Service worker not registered:', err)));
  loadReports();
})();
