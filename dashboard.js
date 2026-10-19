
"use strict";

// Zaythadi public dashboard
const DASHBOARD_URL = "https://zkbthficvnutulwkqbge.supabase.co";
const DASHBOARD_KEY = "sb_publishable_Cnm3BpH7gOcEJJGHVfBhYw_G2ufcg_s";

(() => {
  const $ = (selector) => document.querySelector(selector);

  let allReports = [];
  let loading = false;

  const number = (value) => Number(value).toLocaleString("my-MM");

  const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);

  const dateText = (value) => {
    if (!value) return "ရက်စွဲမသိ";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "ရက်စွဲမသိ";
    return date.toLocaleDateString("my-MM", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  function selectedTownship() {
    const selected = $("#township")?.value || "";

    if (selected === "အခြား") {
      return $("#other-township")?.value.trim() || "";
    }

    return selected;
  }

  function addDashboard() {
    if ($("#zaythadi-dashboard")) return;

    const reportSection = $("#reports-list")?.closest(".section");
    if (!reportSection) return;

    const style = document.createElement("style");
    style.textContent = `
      #zaythadi-dashboard { margin: 24px 0; }
      #zaythadi-dashboard .dash-heading {
        display:flex; justify-content:space-between; align-items:center;
        gap:12px; flex-wrap:wrap; margin-bottom:14px;
      }
      #zaythadi-dashboard h2 { margin:0 0 6px; }
      #zaythadi-dashboard .dash-muted {
        color:var(--muted, #64748b); font-size:.9rem; margin:0;
      }
      #zaythadi-dashboard .dash-grid {
        display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px; margin:14px 0;
      }
      #zaythadi-dashboard .dash-card {
        padding:16px; border:1px solid var(--border, #e2e8f0);
        border-radius:14px; background:var(--card, #fff);
        min-width:0;
      }
      #zaythadi-dashboard .dash-card strong {
        display:block; font-size:1.65rem; margin:6px 0;
        overflow-wrap:anywhere;
      }
      #zaythadi-dashboard .dash-label { font-size:.9rem; }
      #zaythadi-dashboard .dash-up { border-top:4px solid #dc2626; }
      #zaythadi-dashboard .dash-stable { border-top:4px solid #eab308; }
      #zaythadi-dashboard .dash-down { border-top:4px solid #16a34a; }
      #zaythadi-dashboard .dash-shortage { border-top:4px solid #2563eb; }
      #zaythadi-dashboard .dash-list {
        border:1px solid var(--border, #e2e8f0);
        border-radius:14px; overflow:hidden; margin-top:12px;
      }
      #zaythadi-dashboard .dash-list h3 { margin:0; padding:14px; }
      #zaythadi-dashboard .dash-item {
        display:flex; justify-content:space-between; gap:12px;
        padding:12px 14px; border-top:1px solid var(--border, #e2e8f0);
      }
      #zaythadi-dashboard .dash-item small {
        display:block; color:var(--muted, #64748b); margin-top:4px;
      }
      #zaythadi-dashboard .dash-button {
        border:1px solid var(--border, #cbd5e1); border-radius:10px;
        padding:9px 12px; background:var(--card, #fff);
        color:inherit; cursor:pointer; font:inherit;
      }
      #zaythadi-dashboard .dash-message {
        margin:10px 0; font-size:.9rem;
        color:var(--muted, #64748b);
      }
      @media (min-width:600px) {
        #zaythadi-dashboard .dash-grid {
          grid-template-columns:repeat(4,minmax(0,1fr));
        }
      }
    `;
    document.head.appendChild(style);

    const section = document.createElement("section");
    section.id = "zaythadi-dashboard";
    section.className = "section";
    section.innerHTML = `
      <div class="dash-heading">
        <div>
          <h2>📊 ဈေးကွက် Dashboard</h2>
          <p id="dash-location" class="dash-muted">
            မြို့နယ်အားလုံး · ပြည်သူတင်ပြချက်များ
          </p>
        </div>
        <button id="dash-refresh" class="dash-button" type="button">
          ↻ ပြန်လည်ဖတ်ရန်
        </button>
      </div>

      <div class="dash-grid" aria-live="polite">
        <article class="dash-card dash-up">
          <span class="dash-label">📈 ဈေးတက်</span>
          <strong id="dash-rise">—</strong>
          <span class="dash-muted">တင်ပြချက်</span>
        </article>
        <article class="dash-card dash-stable">
          <span class="dash-label">➖ ဈေးငြိမ်</span>
          <strong id="dash-stable">—</strong>
          <span class="dash-muted">တင်ပြချက်</span>
        </article>
        <article class="dash-card dash-down">
          <span class="dash-label">📉 ဈေးကျ</span>
          <strong id="dash-fall">—</strong>
          <span class="dash-muted">တင်ပြချက်</span>
        </article>
        <article class="dash-card dash-shortage">
          <span class="dash-label">🚫 ကုန်ပြတ်</span>
          <strong id="dash-shortage">—</strong>
          <span class="dash-muted">တင်ပြချက်</span>
        </article>
      </div>

      <p id="dash-total" class="dash-muted"></p>
      <p id="dash-message" class="dash-message" role="status" aria-live="polite">
        Database မှ အချက်အလက်များကို ဖတ်နေပါတယ်…
      </p>

      <div class="dash-list">
        <h3>🔎 ဈေးတက် / ကုန်ပြတ် တင်ပြချက်များသော ကုန်ပစ္စည်းများ</h3>
        <div id="dash-products">
          <p class="dash-item">အချက်အလက်များကို ဖတ်နေပါတယ်…</p>
        </div>
      </div>
      <p class="dash-muted" style="margin-top:12px">
        သတိပြုရန် — ဤစာရင်းသည် ပြည်သူတင်ပြချက်များကိုသာ အခြေခံထားပြီး
        အတည်ပြုထားသော ဈေးကွက်စာရင်းအင်း မဟုတ်ပါ။
      </p>
    `;

    reportSection.parentNode.insertBefore(section, reportSection);

    $("#dash-refresh").addEventListener("click", loadDashboard);
  }

  async function fetchAllReports() {
    const rows = [];
    const pageSize = 1000;
    let start = 0;

    while (true) {
      const url = new URL(`${DASHBOARD_URL}/rest/v1/price_reports`);
      url.searchParams.set(
        "select",
        "id,township,product,status,price,unit,created_at"
      );
      url.searchParams.set("order", "created_at.desc");

      const response = await fetch(url.toString(), {
        headers: {
          apikey: DASHBOARD_KEY,
          Authorization: `Bearer ${DASHBOARD_KEY}`,
          "Range-Unit": "items",
          Range: `${start}-${start + pageSize - 1}`
        }
      });

      if (!response.ok) {
        throw new Error(`Database ပြန်ကြားချက် ${response.status}`);
      }

      const page = await response.json();
      rows.push(...page);

      if (page.length < pageSize) break;

      start += page.length;

      // Avoid an accidental unbounded download if the table grows very large.
      if (start >= 20000) break;
    }

    return rows;
  }

  function renderDashboard() {
    const township = selectedTownship();
    const reports = township
      ? allReports.filter((r) => (r.township || "") === township)
      : allReports;

    const counts = {
      rise: 0,
      stable: 0,
      fall: 0,
      shortage: 0
    };

    reports.forEach((report) => {
      if (Object.prototype.hasOwnProperty.call(counts, report.status)) {
        counts[report.status]++;
      }
    });

    $("#dash-rise").textContent = number(counts.rise);
    $("#dash-stable").textContent = number(counts.stable);
    $("#dash-fall").textContent = number(counts.fall);
    $("#dash-shortage").textContent = number(counts.shortage);

    $("#dash-location").textContent = township
      ? `${township} · ပြည်သူတင်ပြချက်များ`
      : "မြို့နယ်အားလုံး · ပြည်သူတင်ပြချက်များ";

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const lastSevenDays = reports.filter((report) => {
      const timestamp = new Date(report.created_at).getTime();
      return Number.isFinite(timestamp) && timestamp >= sevenDaysAgo;
    }).length;

    $("#dash-total").textContent =
      `စုစုပေါင်း ${number(reports.length)} ခု · နောက်ဆုံး ၇ ရက်အတွင်း ${number(lastSevenDays)} ခု`;

    const products = new Map();

    reports.forEach((report) => {
      if (!["rise", "shortage"].includes(report.status)) return;

      const name = report.product || "ကုန်ပစ္စည်းမသိ";

      if (!products.has(name)) {
        products.set(name, { name, rise: 0, shortage: 0, latest: "" });
      }

      const item = products.get(name);

      if (report.status === "rise") item.rise++;
      if (report.status === "shortage") item.shortage++;

      if (
        report.created_at &&
        (!item.latest ||
          new Date(report.created_at).getTime() >
          new Date(item.latest).getTime())
      ) {
        item.latest = report.created_at;
      }
    });

    const ranked = Array.from(products.values())
      .sort((a, b) =>
        (b.rise + b.shortage) - (a.rise + a.shortage)
      )
      .slice(0, 5);

    const container = $("#dash-products");

    if (!ranked.length) {
      container.innerHTML = `
        <p class="dash-item">
          ဈေးတက် / ကုန်ပြတ် တင်ပြချက် မရှိသေးပါ။
        </p>
      `;
      return;
    }

    container.innerHTML = ranked.map((item) => `
      <div class="dash-item">
        <div>
          <strong>${safe(item.name)}</strong>
          <small>
            ဈေးတက် ${number(item.rise)} ခု ·
            ကုန်ပြတ် ${number(item.shortage)} ခု
          </small>
        </div>
        <span class="dash-muted">${safe(dateText(item.latest))}</span>
      </div>
    `).join("");
  }

  async function loadDashboard() {
    if (loading) return;

    loading = true;
    const message = $("#dash-message");
    const button = $("#dash-refresh");

    if (message) message.textContent = "Database မှ အချက်အလက်များကို ဖတ်နေပါတယ်…";
    if (button) button.disabled = true;

    try {
      allReports = await fetchAllReports();
      renderDashboard();

      if (message) {
        message.textContent =
          `Database မှ တင်ပြချက်များကို ဖတ်ပြီးပါပြီ · နောက်ဆုံးဖတ်ချိန် ${new Date().toLocaleTimeString("my-MM")}`;
      }
    } catch (error) {
      console.error("Zaythadi dashboard error:", error);
      if (message) {
        message.textContent =
          "Dashboard ဒေတာဖတ်မရပါ။ Internet၊ Supabase Key နဲ့ SELECT policy ကို စစ်ဆေးပါ။";
      }
    } finally {
      loading = false;
      if (button) button.disabled = false;
    }
  }

  function start() {
    addDashboard();

    if (!$("#zaythadi-dashboard")) return;

    $("#township")?.addEventListener("change", renderDashboard);
    $("#other-township")?.addEventListener("input", renderDashboard);

    // Reload after a report submission has had time to reach Supabase.
    $("#price-form")?.addEventListener("submit", () => {
      window.setTimeout(loadDashboard, 2500);
    });

    loadDashboard();

    // Periodically pick up reports submitted by other visitors.
    window.setInterval(loadDashboard, 60000);
  }

  start();
})();
