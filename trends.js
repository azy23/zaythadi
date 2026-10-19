
(() => {
  "use strict";

  const SUPABASE_URL = "https://zkbthficvnutulwkqbge.supabase.co";

  // dashboard.js ထဲက လက်ရှိအသုံးပြုနေသော publishable key ကို သုံးပါ။
  const SUPABASE_KEY = "sb_publishable_Cnm3BpH7gOcEJJGHVfBhYw_G2ufcg_s";

  const PAGE_SIZE = 1000;
  const MAX_ROWS = 20000;
  let reports = [];
  let loading = false;

  const $ = (id) => document.getElementById(id);

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[ch]);
  }

  function formatPrice(value) {
    return Number(value).toLocaleString("en-US", {
      maximumFractionDigits: 2
    });
  }

  function formatDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function addStyles() {
    if ($("zaythadi-trends-style")) return;

    const style = document.createElement("style");
    style.id = "zaythadi-trends-style";
    style.textContent = `
      #zaythadi-trends {
        margin: 24px 0;
        padding: 20px;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        background: #fff;
        color: #1f2937;
      }
      #zaythadi-trends * { box-sizing: border-box; }
      #zaythadi-trends h2 { margin: 0 0 8px; font-size: 1.35rem; }
      #zaythadi-trends .zt-subtitle {
        margin: 0 0 18px; color: #64748b; line-height: 1.6;
      }
      #zaythadi-trends .zt-controls {
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px; margin-bottom: 18px;
      }
      #zaythadi-trends .zt-field label {
        display: block; margin-bottom: 6px; font-weight: 600;
        font-size: .9rem;
      }
      #zaythadi-trends select,
      #zaythadi-trends button {
        width: 100%; min-height: 44px; padding: 10px;
        border-radius: 10px; border: 1px solid #cbd5e1;
        font: inherit; background: white; color: #1f2937;
      }
      #zaythadi-trends button {
        background: #2563eb; border-color: #2563eb; color: white;
        font-weight: 700; cursor: pointer;
      }
      #zaythadi-trends .zt-status {
        padding: 12px; border-radius: 10px; background: #f1f5f9;
        line-height: 1.6; margin: 12px 0;
      }
      #zaythadi-trends .zt-chart-wrap {
        width: 100%; overflow-x: auto; margin: 10px 0;
      }
      #zaythadi-trends svg {
        display: block; width: 100%; min-width: 320px; height: auto;
      }
      #zaythadi-trends .zt-legend {
        display: flex; flex-wrap: wrap; gap: 14px;
        margin: 8px 0 16px; font-size: .9rem;
      }
      #zaythadi-trends .zt-legend span::before {
        content: ""; display: inline-block; width: 10px; height: 10px;
        border-radius: 50%; margin-right: 6px; background: var(--zt-color);
      }
      #zaythadi-trends .zt-table-wrap { overflow-x: auto; }
      #zaythadi-trends table {
        border-collapse: collapse; width: 100%; min-width: 520px;
      }
      #zaythadi-trends th, #zaythadi-trends td {
        padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0;
        font-size: .9rem;
      }
      #zaythadi-trends th { background: #f8fafc; }
      #zaythadi-trends .zt-note {
        color: #64748b; font-size: .85rem; line-height: 1.6;
        margin-top: 14px;
      }
      @media (max-width: 520px) {
        #zaythadi-trends { padding: 14px; }
        #zaythadi-trends .zt-controls { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function createPanel() {
    if ($("zaythadi-trends")) return $("zaythadi-trends");

    const panel = document.createElement("section");
    panel.id = "zaythadi-trends";
    panel.innerHTML = `
      <h2>📈 ဈေးနှုန်း အတက်အကျမှတ်တမ်း</h2>
      <p class="zt-subtitle">
        ကုန်ပစ္စည်းတစ်မျိုးတည်း၏ ဈေးနှုန်းကို မြို့နယ်နှစ်ခုအကြား နှိုင်းယှဉ်ကြည့်နိုင်ပါသည်။
      </p>
      <div class="zt-controls">
        <div class="zt-field">
          <label for="zt-product">ကုန်ပစ္စည်းနှင့် အတိုင်းအတာ</label>
          <select id="zt-product"><option value="">ဒေတာကို ရယူနေပါသည်...</option></select>
        </div>
        <div class="zt-field">
          <label for="zt-town-a">မြို့နယ် (၁)</label>
          <select id="zt-town-a"></select>
        </div>
        <div class="zt-field">
          <label for="zt-town-b">မြို့နယ် (၂)</label>
          <select id="zt-town-b"></select>
        </div>
        <div class="zt-field">
          <label>&nbsp;</label>
          <button type="button" id="zt-refresh">ဒေတာ ပြန်လည်ရယူရန်</button>
        </div>
      </div>
      <div id="zt-status" class="zt-status" role="status">
        Database မှ ဈေးနှုန်းမှတ်တမ်းများကို ရယူနေပါသည်။
      </div>
      <div id="zt-legend" class="zt-legend"></div>
      <div id="zt-chart" class="zt-chart-wrap"></div>
      <div id="zt-table" class="zt-table-wrap"></div>
      <p class="zt-note">
        မှတ်ချက် — ဂရပ်တွင် ဈေးနှုန်းအမှန်တကယ် ထည့်သွင်းထားသော တင်ပြချက်များကိုသာ ဖော်ပြထားပါသည်။
        ဈေးနှုန်းများသည် ပြည်သူတင်ပြချက်များဖြစ်ပြီး တရားဝင်ဈေးကွက်စာရင်း မဟုတ်ပါ။
        တူညီသော ကုန်ပစ္စည်းနှင့် အတိုင်းအတာကိုသာ နှိုင်းယှဉ်ထားပါသည်။
      </p>
    `;

    const reportsList = $("reports-list");
    const dashboard = $("zaythadi-dashboard");

    if (dashboard && dashboard.parentNode) {
      dashboard.parentNode.insertBefore(panel, dashboard.nextSibling);
    } else if (reportsList) {
      const section = reportsList.closest(".section") || reportsList.parentNode;
      section.parentNode.insertBefore(panel, section);
    } else {
      document.body.appendChild(panel);
    }

    $("zt-refresh").addEventListener("click", loadReports);
    $("zt-product").addEventListener("change", render);
    $("zt-town-a").addEventListener("change", render);
    $("zt-town-b").addEventListener("change", render);

    return panel;
  }

  async function fetchAllReports() {
    const all = [];

    for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
      const url = new URL(`${SUPABASE_URL}/rest/v1/price_reports`);
      url.searchParams.set(
        "select",
        "id,township,product,status,price,unit,created_at"
      );
      url.searchParams.set("order", "created_at.asc");
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("offset", String(offset));

      const response = await fetch(url, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Database error (${response.status}): ${detail}`);
      }

      const batch = await response.json();
      all.push(...batch);

      if (batch.length < PAGE_SIZE) break;
    }

    return all;
  }

  function productKey(row) {
    return `${String(row.product || "").trim()}|||${String(row.unit || "").trim()}`;
  }

  function productLabel(row) {
    const product = String(row.product || "").trim();
    const unit = String(row.unit || "").trim();
    return unit ? `${product} — ${unit}` : `${product} — အတိုင်းအတာ မဖော်ပြထား`;
  }

  function populateFilters() {
    const products = new Map();
    const townships = new Set();

    reports.forEach((row) => {
      if (row.product) products.set(productKey(row), productLabel(row));
      if (row.township) townships.add(String(row.township).trim());
    });

    const productSelect = $("zt-product");
    const previousProduct = productSelect.value;
    productSelect.innerHTML = "";

    [...products.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .forEach(([key, label]) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = label;
        productSelect.appendChild(option);
      });

    if (products.has(previousProduct)) productSelect.value = previousProduct;

    const townshipOptions = [...townships].sort((a, b) => a.localeCompare(b));
    ["zt-town-a", "zt-town-b"].forEach((id, index) => {
      const select = $(id);
      const previous = select.value;
      select.innerHTML = "";

      townshipOptions.forEach((township) => {
        const option = document.createElement("option");
        option.value = township;
        option.textContent = township;
        select.appendChild(option);
      });

      if (townshipOptions.includes(previous)) {
        select.value = previous;
      } else if (index === 1 && townshipOptions.length > 1) {
        select.selectedIndex = 1;
      }
    });
  }

  function svgElement(name, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  }

  function drawChart(seriesA, seriesB) {
    const container = $("zt-chart");
    container.innerHTML = "";

    const allPoints = [...seriesA, ...seriesB];
    if (!allPoints.length) {
      container.textContent = "ရွေးထားသော ကုန်ပစ္စည်းနှင့် မြို့နယ်များအတွက် ဈေးနှုန်းဒေတာ မလုံလောက်သေးပါ။";
      return;
    }

    const width = 680;
    const height = 300;
    const pad = { left: 70, right: 20, top: 20, bottom: 55 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const values = allPoints.map((p) => Number(p.price));
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min = Math.max(0, min * 0.9);
      max = max * 1.1 || 1;
    } else {
      const margin = (max - min) * 0.12;
      min = Math.max(0, min - margin);
      max += margin;
    }

    const dates = [...new Set(allPoints.map((p) => p.created_at))].sort();
    const dateIndex = new Map(dates.map((d, i) => [d, i]));
    const x = (point) => dates.length <= 1
      ? pad.left + plotW / 2
      : pad.left + (dateIndex.get(point.created_at) / (dates.length - 1)) * plotW;
    const y = (point) =>
      pad.top + plotH - ((Number(point.price) - min) / (max - min)) * plotH;

    const svg = svgElement("svg", {
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": "ရွေးချယ်ထားသော မြို့နယ်များ၏ ဈေးနှုန်းဂရပ်"
    });

    for (let i = 0; i <= 4; i++) {
      const value = min + ((max - min) * i) / 4;
      const yy = pad.top + plotH - (i / 4) * plotH;
      svg.appendChild(svgElement("line", {
        x1: pad.left, y1: yy, x2: width - pad.right, y2: yy,
        stroke: "#e2e8f0", "stroke-width": 1
      }));

      const label = svgElement("text", {
        x: pad.left - 8, y: yy + 4, "text-anchor": "end",
        fill: "#475569", "font-size": 11
      });
      label.textContent = formatPrice(value);
      svg.appendChild(label);
    }

    const colors = ["#2563eb", "#e11d48"];

    [seriesA, seriesB].forEach((series, index) => {
      if (!series.length) return;
      const points = series.map((p) => `${x(p)},${y(p)}`).join(" ");
      svg.appendChild(svgElement("polyline", {
        points,
        fill: "none",
        stroke: colors[index],
        "stroke-width": 3,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      }));

      series.forEach((point) => {
        const circle = svgElement("circle", {
          cx: x(point), cy: y(point), r: 4,
          fill: colors[index], stroke: "#fff", "stroke-width": 1.5
        });
        const title = svgElement("title");
        title.textContent =
          `${formatDate(point.created_at)}: ${formatPrice(point.price)} ကျပ်`;
        circle.appendChild(title);
        svg.appendChild(circle);
      });
    });

    const tickIndexes = [...new Set([
      0,
      Math.floor((dates.length - 1) / 2),
      dates.length - 1
    ])];

    tickIndexes.forEach((i) => {
      const label = svgElement("text", {
        x: dates.length <= 1 ? pad.left + plotW / 2 : pad.left + (i / (dates.length - 1)) * plotW,
        y: height - 24,
        "text-anchor": i === 0 ? "start" : (i === dates.length - 1 ? "end" : "middle"),
        fill: "#475569",
        "font-size": 11
      });
      label.textContent = formatDate(dates[i]);
      svg.appendChild(label);
    });

    container.appendChild(svg);
  }

  function renderTable(rows) {
    const container = $("zt-table");
    container.innerHTML = "";

    if (!rows.length) {
      container.textContent = "ဖော်ပြရန် ဈေးနှုန်းမှတ်တမ်း မရှိသေးပါ။";
      return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
      <thead><tr>
        <th>ရက်စွဲ</th><th>မြို့နယ်</th><th>ဈေးနှုန်း (ကျပ်)</th><th>တင်ပြမှု</th>
      </tr></thead>
    `;

    const tbody = document.createElement("tbody");
    rows.slice().sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    ).slice(0, 50).forEach((row) => {
      const tr = document.createElement("tr");
      [
        formatDate(row.created_at),
        row.township,
        formatPrice(row.price),
        ({
          rise: "ဈေးတက်",
          stable: "တည်ငြိမ်",
          fall: "ဈေးကျ",
          shortage: "ပစ္စည်းပြတ်"
        })[row.status] || row.status || "—"
      ].forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value ?? "—";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  function render() {
    if (!reports.length) return;

    const selectedKey = $("zt-product").value;
    const townshipA = $("zt-town-a").value;
    const townshipB = $("zt-town-b").value;

    const matching = reports.filter((row) =>
      productKey(row) === selectedKey &&
      row.price !== null &&
      row.price !== "" &&
      Number.isFinite(Number(row.price)) &&
      Number(row.price) >= 0
    );

    const seriesA = matching
      .filter((row) => String(row.township).trim() === townshipA)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const seriesB = matching
      .filter((row) => String(row.township).trim() === townshipB)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    $("zt-legend").innerHTML = `
      <span style="--zt-color:#2563eb">${escapeHTML(townshipA || "မြို့နယ် ၁")}</span>
      <span style="--zt-color:#e11d48">${escapeHTML(townshipB || "မြို့နယ် ၂")}</span>
    `;

    $("zt-status").textContent =
      `ဈေးနှုန်းပါဝင်သော မှတ်တမ်း စုစုပေါင်း ${matching.length} ခု။ ` +
      `${townshipA || "မြို့နယ် ၁"}: ${seriesA.length} ခု၊ ` +
      `${townshipB || "မြို့နယ် ၂"}: ${seriesB.length} ခု။`;

    drawChart(seriesA, townshipA === townshipB ? [] : seriesB);
    renderTable(
      townshipA === townshipB
        ? seriesA
        : [...seriesA, ...seriesB]
    );
  }

  async function loadReports() {
    if (loading) return;
    loading = true;
    $("zt-refresh").disabled = true;
    $("zt-refresh").textContent = "ဒေတာရယူနေသည်...";
    $("zt-status").textContent = "Database မှ ဒေတာများ ရယူနေပါသည်။";

    try {
      reports = await fetchAllReports();
      populateFilters();

      if (!reports.length) {
        $("zt-status").textContent =
          "Database တွင် ဈေးနှုန်းတင်ပြချက် မရှိသေးပါ။";
        $("zt-chart").textContent = "";
        $("zt-legend").textContent = "";
        $("zt-table").textContent = "";
      } else {
        render();
      }
    } catch (error) {
      console.error("Zaythadi trends:", error);
      $("zt-status").textContent =
        "Database မှ ဒေတာရယူ၍ မရပါ။ Supabase URL၊ publishable key၊ SELECT policy နှင့် အင်တာနက်ကို စစ်ဆေးပါ။";
      $("zt-chart").textContent = "";
      $("zt-legend").textContent = "";
      $("zt-table").textContent = "";
    } finally {
      loading = false;
      $("zt-refresh").disabled = false;
      $("zt-refresh").textContent = "ဒေတာ ပြန်လည်ရယူရန်";
    }
  }

  function init() {
    addStyles();
    createPanel();
    loadReports();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
