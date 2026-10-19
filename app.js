
"use strict";

// Zaythadi - Supabase configuration
const SUPABASE_URL = "https://zkbthficvnutulwkqbge.supabase.co";

// Paste your sb_publishable_... key between the quotes.
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Cnm3BpH7gOcEJJGHVfBhYw_G2ufcg_s";

const PRICE_KEY = "zaythadi_prices_v1";
const NEWS_KEY = "zaythadi_market_news_v1";
const TOWNSHIP_KEY = "zaythadi_township_v1";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

let remoteReports = [];
let remoteLoadError = false;

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
  return report.created_at || report.date ||
    report.reportDate || report.createdAt || "";
}

function reportTownship(report) {
  return report.township || "မြို့နယ်မသိ";
}

function reportProduct(report) {
  return report.product || "ကုန်ပစ္စည်းမသိ";
}

function reportPriceText(report) {
  const price = Number(report.price);

  if (
    report.price === "" ||
    report.price == null ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return "";
  }

  const unit = report.unit && report.unit !== "မသိ"
    ? ` / ${escapeHtml(report.unit)}`
    : "";

  return `${formatNumber(price)} ကျပ်${unit}`;
}

function setMessage(selector, message, type = "") {
  const element = $(selector);
  if (!element) return;

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
    // Continue if browser storage is unavailable.
  }

  showConditionalFields();
  renderAll();
}

function loadTownshipPreference() {
  try {
    const saved = localStorage.getItem(TOWNSHIP_KEY);

    if (
      saved &&
      Array.from($("#township").options).some(
        (option) => option.value === saved
      )
    ) {
      $("#township").value = saved;
    }
  } catch {
    // Ignore unavailable browser storage.
  }

  showConditionalFields();
}

function visibleReports() {
  const localReports = readList(PRICE_KEY);
  const township = getTownship();

  // Keep old browser reports and shared Supabase reports visible.
  const allReports = [
    ...localReports.map((report) => ({
      ...report,
      _local: true
    })),
    ...remoteReports.map((report) => ({
      ...report,
      _local: false
    }))
  ];

  if (!township) return allReports;

  return allReports.filter(
    (report) => reportTownship(report) === township
  );
}

// ---------- Supabase connection ----------

function hasSupabaseConfig() {
  return (
    SUPABASE_URL.startsWith("https://") &&
    SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")
  );
}

async function supabaseRequest(path, options = {}) {
  if (!hasSupabaseConfig()) {
    throw new Error(
      "Supabase Publishable Key မထည့်ရသေးပါ။ app.js ထဲမှာ key ထည့်ပါ။"
    );
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        "apikey": SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    }
  );

  if (!response.ok) {
    const details = await response.text();
    console.error("Supabase error:", response.status, details);

    throw new Error(
      `Database တုံ့ပြန်မှု အမှား (${response.status})`
    );
  }

  if (response.status === 204) return [];

  return response.json();
}

async function loadRemoteReports() {
  if (!hasSupabaseConfig()) {
    remoteLoadError = true;
    renderAll();

    setMessage(
      "#form-message",
      "Supabase Publishable Key ကို app.js ထဲမှာ ထည့်ပြီးမှ အွန်လိုင်းဒေတာကို ဖတ်နိုင်ပါမယ်။",
      "error"
    );
    return;
  }

  try {
    const rows = await supabaseRequest(
      "price_reports?select=id,township,product,status,price,unit,market_location,note,created_at&order=created_at.desc"
    );

    remoteReports = Array.isArray(rows) ? rows : [];
    remoteLoadError = false;
  } catch (error) {
    remoteLoadError = true;
    console.error("Could not load shared reports:", error);

    setMessage(
      "#form-message",
      "အွန်လိုင်းဒေတာကို ဖတ်မရသေးပါ။ URL, Key, Database policy နဲ့ Internet ကို စစ်ဆေးပါ။",
      "error"
    );
  }

  renderAll();
}

async function submitRemoteReport(report) {
  const payload = {
    township: report.township,
    product: report.product,
    status: report.status,
    price: report.price === "" ? null : Number(report.price),
    unit: report.price === "" ? null : (report.unit || null),
    market_location: null,
    note: null
  };

  const rows = await supabaseRequest("price_reports", {
    method: "POST",
    headers: {
      "Prefer": "return=representation"
    },
    body: JSON.stringify(payload)
  });

  if (Array.isArray(rows) && rows.length > 0) {
    remoteReports.unshift(rows[0]);
  } else {
    // Reload if the server did not return the inserted record.
    await loadRemoteReports();
  }
}

// ---------- Market summary and report list ----------

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
    ? `${township} · တင်ပြချက်များ`
    : "မြို့နယ်အားလုံး · တင်ပြချက်များ";

  const known = rise + stable + fall + shortage;
  const note = $("#data-note");

  if (known === 0) {
    note.textContent =
      "တင်ပြချက်မရှိသေးပါ။ အချက်အလက်မလုံလောက်သေးရင် ဈေးကွက်အခြေအနေကို မခန့်မှန်းပါ။";
  } else {
    note.textContent =
      `တင်ပြချက် ${formatNumber(known)} ခုရှိပါတယ်။ ပြည်သူတင်ပြထားတဲ့ အချက်အလက်တွေဖြစ်ပြီး အတည်ပြုပြီးသား စာရင်းအင်းမဟုတ်ပါ။`;
  }

  if (remoteLoadError) {
    note.textContent +=
      " အွန်လိုင်းဒေတာ ချိတ်ဆက်မှုကို စစ်ဆေးရန်လိုအပ်ပါသည်။";
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
        <p>တင်ပြချက်တွေ ရလာတဲ့အခါ ဒီနေရာမှာ မြင်ရပါမယ်။</p>
      </div>
    `;
    return;
  }

  list.innerHTML = reports.slice(0, 40).map((report) => {
    const status = normalizeStatus(report);
    const priceText = reportPriceText(report);
    const noteText = report.note || report.notes || "";
    const notes = noteText
      ? `<p>${escapeHtml(noteText)}</p>`
      : "";

    // Only browser-local records can be deleted from this interface.
    const deleteButton = report._local
      ? `<button class="report-delete" type="button"
          data-delete-id="${escapeHtml(report.id || "")}">
          ဖျက်ရန်
        </button>`
      : `<span class="report-meta">အွန်လိုင်းတင်ပြချက်</span>`;

    return `
      <article class="report-card">
        <div class="report-top">
          <div>
            <strong>${escapeHtml(reportProduct(report))}</strong>
            <div class="report-meta">
              ${escapeHtml(reportTownship(report))}
            </div>
          </div>
          <span class="report-status ${statusClass(status)}">
            ${escapeHtml(statusLabel(status))}
          </span>
        </div>
        ${priceText ? `<div class="report-price">${priceText}</div>` : ""}
        ${notes}
        <div class="report-bottom">
          <span class="report-meta">
            ${escapeHtml(formatDate(reportDate(report)))}
          </span>
          ${deleteButton}
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

// ---------- Status and product selection ----------

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

$("#other-township").addEventListener("input", renderAll);

// ---------- Submit price report ----------

$("#price-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = $("#price-form").querySelector(
    'button[type="submit"]'
  );

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
    setMessage(
      "#form-message",
      "ဈေးတက်၊ ဈေးငြိမ်၊ ဈေးကျ သို့မဟုတ် ကုန်ပြတ်ထဲက တစ်ခု ရွေးပါ။",
      "error"
    );
    return;
  }

  if (!product) {
    setMessage("#form-message", "ကုန်ပစ္စည်းတစ်ခု ရွေးပေးပါ။", "error");
    return;
  }

  if (priceInput !== "" && (!Number.isFinite(price) || price <= 0)) {
    setMessage(
      "#form-message",
      "ဈေးနှုန်းထည့်မယ်ဆိုရင် သုညထက်ကြီးတဲ့ ဂဏန်းကို ထည့်ပါ။",
      "error"
    );
    return;
  }

  if (!hasSupabaseConfig()) {
    setMessage(
      "#form-message",
      "Supabase Publishable Key ကို app.js ထဲမှာ အရင်ထည့်ပါ။",
      "error"
    );
    return;
  }

  if (submitButton) submitButton.disabled = true;

  setMessage("#form-message", "တင်ပြချက်ကို အွန်လိုင်းသို့ ပို့နေပါတယ်…");

  try {
    const report = {
      product,
      township,
      status,
      price: priceInput === "" ? "" : price,
      unit: priceInput === "" ? "မသိ" : $("#unit").value
    };

    await submitRemoteReport(report);

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
      "ကျေးဇူးတင်ပါတယ်။ သင့်တင်ပြချက်ကို အွန်လိုင်း Database ထဲ သိမ်းပြီးပါပြီ။",
      "success"
    );

    renderAll();
    $("#reports-list").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (error) {
    console.error("Price report submission failed:", error);

    setMessage(
      "#form-message",
      `တင်ပြချက် မပို့နိုင်သေးပါ။ ${error.message || "Internet နဲ့ Supabase setting ကို စစ်ဆေးပါ။"} Browser ထဲမှာပဲ သိမ်းပြီး အောင်မြင်တယ်လို့ မပြပါဘူး။`,
      "error"
    );
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

// ---------- Delete browser-local reports only ----------

$("#reports-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;

  const id = button.dataset.deleteId;
  if (!id) return;

  const confirmed = window.confirm(
    "ဒီ Browser ထဲက တင်ပြချက်ကို ဖျက်မှာ သေချာပါသလား?"
  );

  if (!confirmed) return;

  const reports = readList(PRICE_KEY).filter(
    (report) => String(report.id) !== id
  );

  if (!saveList(PRICE_KEY, reports)) {
    setMessage("#form-message", "မှတ်တမ်းကို ဖျက်လို့မရပါ။", "error");
    return;
  }

  setMessage("#form-message", "Browser ထဲက မှတ်တမ်းကို ဖျက်ပြီးပါပြီ။", "success");
  renderAll();
});

// ---------- Market news remains browser-local for now ----------

$("#rumor-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const text = $("#rumor-text").value.trim();
  const township = getTownship();

  if (!township) {
    setMessage(
      "#rumor-message",
      "အရင်ဆုံး အပေါ်မှာ မိမိမြို့နယ်ကို ရွေးပါ။",
      "error"
    );
    $("#township").focus();
    return;
  }

  if (text.length < 5) {
    setMessage(
      "#rumor-message",
      "သတင်းကို အနည်းဆုံး စာလုံးအနည်းငယ် ရေးပေးပါ။",
      "error"
    );
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
    "သတင်းကို ဒီ Browser ထဲမှာပဲ သိမ်းထားပါတယ်။ အခြားသူတွေဆီ မပို့ရသေးပါ။",
    "success"
  );

  renderNews();
});

// ---------- Start app ----------

loadTownshipPreference();
renderAll();
loadRemoteReports();
