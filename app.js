
"use strict";

const PRICE_KEY = "zaythadi_prices_v1";
const NEWS_KEY = "zaythadi_market_news_v1";

const $ = (selector) => document.querySelector(selector);

const priceForm = $("#price-form");
const newsForm = $("#rumor-form");
const reportList = $("#reports-list");
const newsList = $("#rumors-list");
const searchInput = $("#search-reports");
const formMessage = $("#form-message");
const newsMessage = $("#rumor-message");

function readStorage(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatNumber(value) {
  return Number(value).toLocaleString("my-MM", {
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  if (!value) return "ရက်စွဲမသိ";
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("my-MM", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getToday() {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );
  return localDate.toISOString().slice(0, 10);
}

function showMessage(element, message, success = true) {
  if (!element) return;
  element.textContent = message;
  element.style.color = success ? "#176b45" : "#b42318";
}

function getPrices() {
  return readStorage(PRICE_KEY);
}

function getNews() {
  return readStorage(NEWS_KEY);
}

function updateStats(prices) {
  const townshipSet = new Set(
    prices.map((item) =>
      String(item.township || "").trim().toLocaleLowerCase()
    ).filter(Boolean)
  );

  $("#total-reports").textContent = formatNumber(prices.length);
  $("#total-townships").textContent = formatNumber(townshipSet.size);
  $("#today-reports").textContent = formatNumber(
    prices.filter((item) => item.reportDate === getToday()).length
  );
}

function renderPrices() {
  const prices = getPrices();
  const query = (searchInput?.value || "").trim().toLocaleLowerCase();

  updateStats(prices);

  const filtered = prices
    .filter((item) => {
      const searchable = [
        item.product,
        item.township,
        item.unit,
        item.source,
        item.notes
      ].join(" ").toLocaleLowerCase();

      return searchable.includes(query);
    })
    .sort((a, b) => {
      const dateCompare = String(b.reportDate).localeCompare(
        String(a.reportDate)
      );
      return dateCompare || (b.createdAt || 0) - (a.createdAt || 0);
    });

  if (!filtered.length) {
    reportList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">◎</span>
        <strong>${query ? "ရှာဖွေမှုနှင့် ကိုက်ညီသော မှတ်တမ်းမရှိပါ" : "မှတ်တမ်း မရှိသေးပါ"}</strong>
        <p>${query ? "စာလုံးပေါင်းကို ပြောင်းပြီး ထပ်ရှာကြည့်ပါ။" : "ပထမဆုံး ဈေးနှုန်းတင်ပြချက်ကို ထည့်သွင်းနိုင်ပါတယ်။"}</p>
      </div>`;
    return;
  }

  reportList.innerHTML = filtered.map((item) => `
    <article class="report-card">
      <span class="report-tag">${escapeHTML(item.township)}</span>
      <h3>${escapeHTML(item.product)}</h3>
      <p class="report-price">${formatNumber(item.price)} ကျပ် / ${escapeHTML(item.unit)}</p>
      <p>ရက်စွဲ — ${escapeHTML(formatDate(item.reportDate))}</p>
      <p>ရင်းမြစ် — ${escapeHTML(item.source || "မဖော်ပြထား")}</p>
      ${item.notes ? `<p>မှတ်ချက် — ${escapeHTML(item.notes)}</p>` : ""}
      <p class="report-meta">အသုံးပြုသူတင်ပြချက် · အတည်ပြုထားခြင်း မဟုတ်ပါ</p>
      <button class="secondary-button delete-price" type="button" data-id="${escapeHTML(item.id)}">ဒီမှတ်တမ်းဖျက်ရန်</button>
    </article>
  `).join("");
}

function renderNews() {
  const news = getNews().sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );

  if (!news.length) {
    newsList.innerHTML = `
      <div class="empty-state">
        <strong>တင်ပြချက် မရှိသေးပါ</strong>
        <p>တင်ပြထားသော သတင်းများကို ဤနေရာတွင် ကြည့်ရှုနိုင်ပါမည်။</p>
      </div>`;
    return;
  }

  newsList.innerHTML = news.map((item) => `
    <article class="report-card">
      <span class="report-tag">အတည်မပြုရသေးသော တင်ပြချက်</span>
      <p>${escapeHTML(item.text)}</p>
      ${item.township ? `<p>မြို့နယ် — ${escapeHTML(item.township)}</p>` : ""}
      ${item.source ? `<p>ရင်းမြစ် — ${escapeHTML(item.source)}</p>` : ""}
      <p class="report-meta">တင်ပြသည့်ရက် — ${escapeHTML(formatDate(item.reportDate))}</p>
    </article>
  `).join("");
}

priceForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(priceForm);
  const product = String(formData.get("product") || "").trim();
  const township = String(formData.get("township") || "").trim();
  const price = Number(formData.get("price"));
  const unit = String(formData.get("unit") || "").trim();
  const reportDate = String(formData.get("reportDate") || "");

  if (!product || !township || !unit || !reportDate) {
    showMessage(formMessage, "လိုအပ်သော အချက်အလက်များကို ဖြည့်ပါ။", false);
    return;
  }

  if (!Number.isFinite(price) || price <= 0) {
    showMessage(formMessage, "ဈေးနှုန်းကို မှန်ကန်စွာ ထည့်ပါ။", false);
    return;
  }

  if (reportDate > getToday()) {
    showMessage(formMessage, "အနာဂတ်ရက်စွဲကို မရွေးပါနှင့်။", false);
    return;
  }

  const prices = getPrices();

  prices.push({
    id: makeId(),
    product,
    township,
    price,
    unit,
    reportDate,
    source: String(formData.get("source") || "မဖော်ပြထား"),
    notes: String(formData.get("notes") || "").trim(),
    createdAt: Date.now()
  });

  if (!writeStorage(PRICE_KEY, prices)) {
    showMessage(
      formMessage,
      "ဒေတာသိမ်းမရပါ။ Browser storage နေရာလွတ်ကို စစ်ဆေးပါ။",
      false
    );
    return;
  }

  priceForm.reset();
  $("#report-date").value = getToday();
  renderPrices();
  showMessage(formMessage, "ဈေးနှုန်းတင်ပြချက်ကို ဒီ Browser ထဲမှာ သိမ်းပြီးပါပြီ။");
});

newsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = $("#rumor-text").value.trim();
  const township = $("#rumor-township").value.trim();
  const source = $("#rumor-source").value.trim();
  const acknowledged = $("#rumor-unverified").checked;

  if (!text || !acknowledged) {
    showMessage(
      newsMessage,
      "သတင်းကို ဖြည့်ပြီး အတည်မပြုရသေးနိုင်ကြောင်း သဘောတူပါ။",
      false
    );
    return;
  }

  const news = getNews();

  news.push({
    id: makeId(),
    text,
    township,
    source,
    reportDate: getToday(),
    createdAt: Date.now()
  });

  if (!writeStorage(NEWS_KEY, news)) {
    showMessage(newsMessage, "ဒေတာသိမ်းမရပါ။ Browser storage ကို စစ်ဆေးပါ။", false);
    return;
  }

  newsForm.reset();
  renderNews();
  showMessage(
    newsMessage,
    "တင်ပြချက်ကို ဒီ Browser ထဲမှာ သိမ်းပြီးပါပြီ။ အခြားသူများထံ မပို့ရသေးပါ။"
  );
});

searchInput.addEventListener("input", renderPrices);

reportList.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-price");
  if (!button) return;

  const confirmed = window.confirm("ဒီဈေးနှုန်းမှတ်တမ်းကို ဖျက်မှာ သေချာပါသလား?");
  if (!confirmed) return;

  const updated = getPrices().filter((item) => item.id !== button.dataset.id);

  if (!writeStorage(PRICE_KEY, updated)) {
    window.alert("မှတ်တမ်းဖျက်မရပါ။");
    return;
  }

  renderPrices();
});

$("#clear-data").addEventListener("click", () => {
  const confirmed = window.confirm(
    "ဒီ Browser ထဲက ဈေးနှုန်းနဲ့ ဈေးကွက်သတင်းမှတ်တမ်းအားလုံးကို ဖျက်မှာ သေချာပါသလား။ ဒီလုပ်ဆောင်ချက်ကို ပြန်ပြင်လို့မရပါ။"
  );

  if (!confirmed) return;

  try {
    localStorage.removeItem(PRICE_KEY);
    localStorage.removeItem(NEWS_KEY);
    renderPrices();
    renderNews();
    showMessage(formMessage, "ဒီ Browser ထဲက မှတ်တမ်းများကို ရှင်းပြီးပါပြီ။");
  } catch {
    showMessage(formMessage, "ဒေတာရှင်းလင်းရာတွင် အမှားဖြစ်နေပါသည်။", false);
  }
});

function exportCSV() {
  const prices = getPrices();

  if (!prices.length) {
    window.alert("ထုတ်ယူရန် ဈေးနှုန်းမှတ်တမ်း မရှိသေးပါ။");
    return;
  }

  const columns = [
    ["product", "ကုန်ပစ္စည်း"],
    ["township", "မြို့နယ်"],
    ["price", "ဈေးနှုန်းကျပ်"],
    ["unit", "ယူနစ်"],
    ["reportDate", "ရက်စွဲ"],
    ["source", "ရင်းမြစ်"],
    ["notes", "မှတ်ချက်"]
  ];

  const csvEscape = (value) =>
    '"' + String(value ?? "").replace(/"/g, '""') + '"';

  const rows = [
    columns.map((column) => csvEscape(column[1])).join(","),
    ...prices.map((item) =>
      columns.map(([key]) => csvEscape(item[key])).join(",")
    )
  ];

  const csv = "\uFEFF" + rows.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `zaythadi-prices-${getToday()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

$("#export-csv").addEventListener("click", exportCSV);

$("#report-date").max = getToday();
$("#report-date").value = getToday();

renderPrices();
renderNews();
