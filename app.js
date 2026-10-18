
"use strict";

const PRICE_KEY = "zaythadi_prices_v1";
const NEWS_KEY = "zaythadi_market_news_v1";
const TOWNSHIP_KEY = "zaythadi_township_v1";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveList(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatNumber(value) {
  return Number(value).toLocaleString("my-MM");
}

function formatDate(value) {
  if (!value) return "ရက်စွဲမသိ";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ရက်စွဲမသိ";
  return date.toLocaleDateString("my-MM", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function todayISO() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

function getTownship() {
  const selected = $("#township").value;
  if (selected === "အခြား") {
    return $("#other-township").value.trim();
  }
  return selected;
}

function normalizeStatus(report) {
  const status = report.status || "";
  if (["rise", "stable", "fall", "shortage"].includes(status)) {
    return status;
  }

  // Compatibility with reports saved by the previous version.
  return "unknown";
}

function statusLabel(status) {
  return {
    rise: "📈 ဈေးတက်",
    stable: "➖ ဈေးငြိမ်",
    fall: "📉 ဈေးကျ",
    shortage: "🚫 ကုန်ပြတ်",
    unknown: "ဈေးနှုန်းတင်ပြချက်"
  }[status] || "ဈေးကွက်သတင်း";
}

function statusClass(status) {
  return ["rise", "stable", "fall", "shortage"].includes(status)
    ? status
    : "";
}

function reportDate(report) {
  return report.date || report.reportDate || report.createdAt || "";
}

function reportTownship(report) {
  return report.township || "မြို့နယ်မသိ";
}

function reportProduct(report) {
  return report.product || "ကုန်ပစ္စည်းမသိ";
}

function reportPriceText(report) {
  const price = Number(report.price);
  if (report.price === "" || report.price == null || !Number.isFinite(price) || price <= 0) {
    return "";
  }

  const unit = report.unit && report.unit !== "မသိ"
    ? ` / ${escapeHtml(report.unit)}`
    : "";

  return `${formatNumber(price)} ကျပ်${unit}`;
}

function setMessage(selector, message, type = "") {
  const element = $(selector);
  element.textContent = message;
  element.className = `form-message ${type}`.trim();
}

function updatePressedButtons(selector, attribute, value) {
  $$(selector).forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      button.dataset[attribute] === value ? "true" : "false"
    );
  });
}

function showConditionalFields() {
  $("#other-product-wrap").classList.toggle(
    "hidden",
    $("#product").value !== "အခြား"
  );

  $("#other-township-wrap").classList.toggle(
    "hidden",
    $("#township").value !== "အခြား"
  );
}

function saveTownshipPreference() {
  const township = $("#township").value;

  try {
    if (township) {
      localStorage.setItem(TOWNSHIP_KEY, township);
    } else {
      localStorage.removeItem(TOWNSHIP_KEY);
    }
  } catch {
    // The app can still work if browser storage is disabled.
  }

  showConditionalFields();
  renderAll();
}

function loadTownshipPreference() {
  try {
    const saved = localStorage.getItem(TOWNSHIP_KEY);
    if (saved && Array.from($("#township").options).some((option) => option.value === saved)) {
      $("#township").value = saved;
    }
  } catch {
    // Ignore unavailable browser storage.
  }

  showConditionalFields();
}

function visibleReports() {
  const reports = readList(PRICE_KEY);
  const township = getTownship();

  if (!township) return reports;

  return reports.filter((report) => reportTownship(report) === township);
}

function renderMarketSummary() {
  const reports = visibleReports();
  let rise = 0;
  let stable = 0;
  let fall = 0;
  let shortage = 0;

  reports.forEach((report) => {
    switch (normalizeStatus(report)) {
      case "rise":
        rise++;
        break;
      case "stable":
        stable++;
        break;
      case "fall":
        fall++;
        break;
      case "shortage":
        shortage++;
        break;
    }
  });

  $("#rise-count").textContent = formatNumber(rise);
  $("#stable-count").textContent = formatNumber(stable);
  $("#fall-count").textContent = formatNumber(fall);

  const township = getTownship();
  $("#market-location").textContent = township
    ? `${township} · သိမ်းထားသော တင်ပြချက်များ`
    : "မြို့နယ်အားလုံး · သိမ်းထားသော တင်ပြချက်များ";

  const known = rise + stable + fall + shortage;
  const note = $("#data-note");

  if (known === 0) {
    note.textContent =
      "တင်ပြချက်မရှိသေးပါ။ အချက်အလက်မလုံလောက်သေးရင် ဈေးကွက်အခြေအနေကို မခန့်မှန်းပါ။";
  } else {
    note.textContent =
      `တင်ပြချက် ${formatNumber(known)} ခုရှိပါတယ်။ ဒါတွေဟာ ပြည်သူတင်ပြထားတဲ့ အချက်အလက်တွေဖြစ်ပြီး အတည်ပြုပြီးသား စာရင်းအင်းမဟုတ်ပါ။`;
  }
}

function renderReports() {
  const reports = visibleReports()
    .slice()
    .sort((a, b) => {
      const dateA = new Date(reportDate(a) || 0).getTime();
      const dateB = new Date(reportDate(b) || 0).getTime();
      return dateB - dateA;
    });

  const list = $("#reports-list");

  if (!reports.length) {
    list.innerHTML = `
      <div class="empty-state">
        <span>🧺</span>
        <strong>တင်ပြချက် မရှိသေးပါ</strong>
        <p>သတင်းတင်ပြချက်တွေ ရလာတဲ့အခါ ဒီနေရာမှာ မြင်ရပါမယ်။</p>
      </div>
    `;
    return;
  }

  list.innerHTML = reports.slice(0, 40).map((report) => {
    const status = normalizeStatus(report);
    const priceText = reportPriceText(report);
    const oldNotes = report.notes ? `<p>${escapeHtml(report.notes)}</p>` : "";

    return `
      <article class="report-card">
        <div class="report-top">
          <div>
            <strong>${escapeHtml(reportProduct(report))}</strong>
            <div class="report-meta">${escapeHtml(reportTownship(report))}</div>
          </div>
          <span class="report-status ${statusClass(status)}">
            ${escapeHtml(statusLabel(status))}
          </span>
        </div>
        ${priceText ? `<div class="report-price">${priceText}</div>` : ""}
        ${oldNotes}
        <div class="report-bottom">
          <span class="report-meta">${escapeHtml(formatDate(reportDate(report)))}</span>
          <button class="report-delete" type="button" data-delete-id="${escapeHtml(report.id || "")}">
            ဖျက်ရန်
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function renderNews() {
  const news = readList(NEWS_KEY);
  const container = $("#rumors-list");

  if (!news.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <h3>သိမ်းထားသော ဈေးကွက်သတင်းများ</h3>
    ${news.slice().reverse().slice(0, 10).map((item) => `
      <article class="news-item">
        <p>${escapeHtml(item.text || "")}</p>
        <div class="report-meta">
          ${escapeHtml(item.township || "မြို့နယ်မသိ")} ·
          ${escapeHtml(formatDate(item.date || item.createdAt))}
          · အတည်မပြုရသေးသော သတင်း
        </div>
      </article>
    `).join("")}
  `;
}

function renderAll() {
  renderMarketSummary();
  renderReports();
  renderNews();
}

$$("[data-status]").forEach((button) => {
  button.addEventListener("click", () => {
    const value = button.dataset.status;
    $("#status").value = value;
    updatePressedButtons("[data-status]", "status", value);
    setMessage("#form-message", "");
  });
});

$$("[data-product]").forEach((button) => {
  button.addEventListener("click", () => {
    const value = button.dataset.product;
    $("#product").value = value;
    updatePressedButtons("[data-product]", "product", value);
    showConditionalFields();
    setMessage("#form-message", "");
  });
});

$("#township").addEventListener("change", saveTownshipPreference);

$("#price-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const status = $("#status").value;
  const selectedProduct = $("#product").value;
  const product = selectedProduct === "အခြား"
    ? $("#other-product").value.trim()
    : selectedProduct;
  const township = getTownship();
  const priceInput = $("#price").value.trim();
  const price = priceInput === "" ? "" : Number(priceInput);

  if (!township) {
    setMessage("#form-message", "အရင်ဆုံး မိမိမြို့နယ်ကို ရွေးပေးပါ။", "error");
    $("#township").focus();
    return;
  }

  if (!status) {
    setMessage("#form-message", "ဈေးတက်၊ ဈေးငြိမ်၊ ဈေးကျ သို့မဟုတ် ကုန်ပြတ်ထဲက တစ်ခု ရွေးပါ။", "error");
    return;
  }

  if (!product) {
    setMessage("#form-message", "ကုန်ပစ္စည်းတစ်ခု ရွေးပေးပါ။", "error");
    return;
  }

  if (priceInput !== "" && (!Number.isFinite(price) || price <= 0)) {
    setMessage("#form-message", "ဈေးနှုန်းထည့်မယ်ဆိုရင် သုညထက်ကြီးတဲ့ ဂဏန်းကို ထည့်ပါ။", "error");
    return;
  }

  const reports = readList(PRICE_KEY);
  const report = {
    id: makeId(),
    product,
    township,
    status,
    price: priceInput === "" ? "" : price,
    unit: priceInput === "" ? "မသိ" : $("#unit").value,
    date: todayISO(),
    createdAt: new Date().toISOString(),
    source: "ပြည်သူတင်ပြချက်",
    notes: ""
  };

  reports.push(report);

  if (!saveList(PRICE_KEY, reports)) {
    setMessage(
      "#form-message",
      "ဒေတာ သိမ်းလို့မရပါ။ Browser storage နေရာလွတ်ရှိမရှိ စစ်ဆေးပါ။",
      "error"
    );
    return;
  }

  $("#status").value = "";
  $("#product").value = "";
  $("#other-product").value = "";
  $("#price").value = "";
  $("#unit").value = "မသိ";

  updatePressedButtons("[data-status]", "status", "");
  updatePressedButtons("[data-product]", "product", "");
  showConditionalFields();

  setMessage(
    "#form-message",
    "ကျေးဇူးတင်ပါတယ်။ သင့်တင်ပြချက်ကို ဒီ Browser ထဲမှာ သိမ်းပြီးပါပြီ။",
    "success"
  );

  renderAll();
  $("#reports-list").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("#reports-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;

  const id = button.dataset.deleteId;
  if (!id) {
    setMessage(
      "#form-message",
      "ဒီမှတ်တမ်းဟာ ဗားရှင်းဟောင်းက ဖြစ်လို့ ဒီခလုတ်နဲ့ ဖျက်လို့မရပါ။",
      "error"
    );
    return;
  }

  const confirmed = window.confirm("ဒီ Browser ထဲက တင်ပြချက်ကို ဖျက်မှာ သေချာပါသလား?");
  if (!confirmed) return;

  const reports = readList(PRICE_KEY).filter((report) => String(report.id) !== id);

  if (!saveList(PRICE_KEY, reports)) {
    setMessage("#form-message", "မှတ်တမ်းကို ဖျက်လို့မရပါ။", "error");
    return;
  }

  setMessage("#form-message", "မှတ်တမ်းကို ဖျက်ပြီးပါပြီ။", "success");
  renderAll();
});

$("#rumor-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const text = $("#rumor-text").value.trim();
  const township = getTownship();

  if (!township) {
    setMessage("#rumor-message", "အရင်ဆုံး အပေါ်မှာ မိမိမြို့နယ်ကို ရွေးပါ။", "error");
    $("#township").focus();
    return;
  }

  if (text.length < 5) {
    setMessage("#rumor-message", "သတင်းကို အနည်းဆုံး စာလုံးအနည်းငယ် ရေးပေးပါ။", "error");
    return;
  }

  if (!$("#rumor-unverified").checked) {
    setMessage(
      "#rumor-message",
      "ဒီသတင်းကို အတည်မပြုရသေးနိုင်ကြောင်း အတည်ပြုအမှန်ခြစ်ပေးပါ။",
      "error"
    );
    return;
  }

  const news = readList(NEWS_KEY);
  news.push({
    id: makeId(),
    text,
    township,
    date: todayISO(),
    createdAt: new Date().toISOString(),
    verified: false
  });

  if (!saveList(NEWS_KEY, news)) {
    setMessage("#rumor-message", "သတင်းကို သိမ်းလို့မရပါ။", "error");
    return;
  }

  $("#rumor-text").value = "";
  $("#rumor-unverified").checked = false;

  setMessage(
    "#rumor-message",
    "သတင်းကို ဒီ Browser ထဲမှာ သိမ်းပြီးပါပြီ။ အခြားသူတွေဆီ မပို့ရသေးပါ။",
    "success"
  );

  renderNews();
});

loadTownshipPreference();
renderAll();
