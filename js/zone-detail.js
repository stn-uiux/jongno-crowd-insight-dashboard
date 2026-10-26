(function () {
  const modal = document.getElementById("zone-detail-modal");
  const panel = document.getElementById("zone-detail-panel");
  const handle = document.getElementById("zone-detail-drag");
  const btnClose = document.getElementById("zone-detail-close");
  const titleEl = document.getElementById("zone-detail-title");
  const levelEl = document.getElementById("zone-detail-level");
  const managersEl = document.getElementById("zone-detail-managers");
  if (!modal || !panel || !handle || !btnClose) return;

  function isLightMode() {
    return document.documentElement.getAttribute("data-mode") === "light";
  }

  /** CSS color token → amcharts hex number (var() 체인 해석) */
  function cssHex(token, fallback) {
    let prop = token.startsWith("--") ? token : `--${token}`;
    let raw = getComputedStyle(document.documentElement).getPropertyValue(prop).trim() || fallback;
    let guard = 0;
    while (raw && raw.startsWith("var(") && guard++ < 10) {
      const match = raw.match(/var\(\s*([^,\s)]+)/);
      if (!match) break;
      prop = match[1];
      raw = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
    }
    const hex = (raw || fallback).replace(/^#/, "");
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const n = parseInt(full, 16);
    return Number.isFinite(n) ? n : parseInt(String(fallback).replace(/^#/, ""), 16);
  }

  function getChartColors() {
    const light = isLightMode();
    const rootStyle = getComputedStyle(document.documentElement);
    const stay = cssHex("--chart-stay", "#55adff");
    const crowd = cssHex("--chart-crowd", "#25C789");
    const axisLabel = cssHex("--chart-axis", light ? "#434f63" : "#d5deea");
    const gridStroke = cssHex("--chart-grid", light ? "#788aa2" : "#b4cde6");
    const gridOpacityX = parseFloat(rootStyle.getPropertyValue("--chart-grid-opacity-x")) || (light ? 0.38 : 0.22);
    const gridOpacityY = parseFloat(rootStyle.getPropertyValue("--chart-grid-opacity-y")) || (light ? 0.42 : 0.28);
    const textPrimary = cssHex("--text-color-primary", light ? "#202a3b" : "#ffffff");
    return {
      stay,
      crowd,
      axisLabel,
      gridStroke,
      gridOpacityX,
      gridOpacityY,
      brushGridOpacity: light ? 0.12 : 0.15,
      cursorStroke: textPrimary,
      cursorOpacity: light ? 0.35 : 0.2,
    };
  }

  const LEVELS = {
    danger: { label: "위험", cls: "is-danger" },
    emergency: { label: "위험", cls: "is-emergency" },
    critical: { label: "위험", cls: "is-critical" },
    warning: { label: "경계", cls: "is-warning" },
    caution: { label: "주의", cls: "is-caution" },
    attention: { label: "관심", cls: "is-attention" },
    watch: { label: "관심", cls: "is-watch" },
    normal: { label: "정상", cls: "is-normal" },
  };

  const MANAGERS = [
    { name: "김수지", phone: "010-1234-5678" },
    { name: "김동원", phone: "010-1234-5678" },
    { name: "김동원", phone: "010-1234-5678" },
  ];

  let drag = null;
  let mainRoot = null;
  let brushRoot = null;
  let brushRange = { start: 0.22, end: 0.58 };
  let brushDrag = null;
  let currentRow = null;

  function placePanel() {
    const w = panel.offsetWidth || 720;
    const h = panel.offsetHeight || 520;
    const left = Math.max(24, (window.innerWidth - w) / 2);
    const top = Math.max(24, (window.innerHeight - h) / 2);
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
  }

  function disposeCharts() {
    if (mainRoot) {
      mainRoot.dispose();
      mainRoot = null;
    }
    if (brushRoot) {
      brushRoot.dispose();
      brushRoot = null;
    }
  }

  function buildSeriesData(row) {
    const hours = ["09:00", "13:00", "17:00", "21:00", "01:00", "05:00", "09:00", "13:00"];
    const bias = ((brushRange.start + brushRange.end) / 2 - 0.5) * 16;
    const baseD = (row.density || 0.8) * 100 + bias;
    const baseP = Math.min(100, (row.people || 40000) / 500) + bias * 0.6;
    return hours.map((hour, i) => {
      const wave = Math.sin(i * 0.9 + brushRange.start * 4) * 12 + Math.cos(i * 0.4) * 8;
      return {
        hourKey: `h${i}`,
        hour,
        density: Math.max(10, Math.min(100, baseD + wave)),
        people: Math.max(10, Math.min(100, baseP + wave * 0.8 + (i % 3) * 4)),
      };
    });
  }

  function buildBrushData(row) {
    const labels = ["Jan '23", "02 Jan", "03 Jan", "04 Jan", "05 Jan"];
    const baseD = (row.density || 0.8) * 100;
    const baseP = Math.min(100, (row.people || 40000) / 500);
    const points = [];
    labels.forEach((day, i) => {
      const steps = i === labels.length - 1 ? 1 : 4;
      for (let s = 0; s < steps; s++) {
        const t = i + s / 4;
        const wave = Math.sin(t * 1.4) * 18 + Math.cos(t * 0.7) * 10;
        points.push({
          dayKey: `d${i}_${s}`,
          day: s === 0 ? day : "",
          density: Math.max(25, Math.min(95, baseD - 10 + t * 6 + wave)),
          people: Math.max(25, Math.min(95, baseP - 8 + t * 7 + wave * 0.7)),
        });
      }
    });
    return points;
  }

  function applyBrushUi() {
    const select = document.getElementById("zone-brush-select");
    const maskL = document.getElementById("zone-brush-mask-left");
    const maskR = document.getElementById("zone-brush-mask-right");
    if (!select || !maskL || !maskR) return;
    const left = brushRange.start * 100;
    const right = (1 - brushRange.end) * 100;
    const width = (brushRange.end - brushRange.start) * 100;
    select.style.left = `${left}%`;
    select.style.width = `${width}%`;
    maskL.style.width = `${left}%`;
    maskR.style.width = `${right}%`;
  }

  function bindBrushInteraction() {
    const wrap = document.getElementById("zone-detail-brush-wrap");
    const select = document.getElementById("zone-brush-select");
    const startH = document.getElementById("zone-brush-start");
    const endH = document.getElementById("zone-brush-end");
    if (!wrap || !select || !startH || !endH || wrap.dataset.brushBound === "1") return;
    wrap.dataset.brushBound = "1";

    const minSpan = 0.12;

    const onMove = (e) => {
      if (!brushDrag) return;
      const rect = wrap.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const span = brushDrag.span;
      if (brushDrag.mode === "move") {
        let start = x - brushDrag.offset;
        start = Math.min(Math.max(0, start), 1 - span);
        brushRange = { start, end: start + span };
      } else if (brushDrag.mode === "start") {
        const start = Math.min(x, brushRange.end - minSpan);
        brushRange = { start: Math.max(0, start), end: brushRange.end };
      } else if (brushDrag.mode === "end") {
        const end = Math.max(x, brushRange.start + minSpan);
        brushRange = { start: brushRange.start, end: Math.min(1, end) };
      }
      applyBrushUi();
    };

    const onUp = () => {
      if (!brushDrag) return;
      brushDrag = null;
      select.classList.remove("is-dragging");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (currentRow) {
        disposeMainOnly();
        createMainChart(currentRow);
      }
    };

    const startDrag = (mode, e) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = wrap.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      brushDrag = {
        mode,
        span: brushRange.end - brushRange.start,
        offset: mode === "move" ? x - brushRange.start : 0,
      };
      select.classList.add("is-dragging");
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };

    startH.addEventListener("pointerdown", (e) => startDrag("start", e));
    endH.addEventListener("pointerdown", (e) => startDrag("end", e));
    select.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".zone-brush-handle")) return;
      startDrag("move", e);
    });
  }

  function disposeMainOnly() {
    if (mainRoot) {
      mainRoot.dispose();
      mainRoot = null;
    }
  }

  function makeTooltip(root, text, color) {
    const tip = am5.Tooltip.new(root, { labelText: text });
    tip.get("background").setAll({
      fill: am5.color(color),
      fillOpacity: 0.85,
      strokeOpacity: 0,
    });
    tip.label.setAll({ fontSize: 12, fontWeight: "700", fill: am5.color(0xffffff) });
    return tip;
  }

  function createMainChart(row) {
    const el = document.getElementById("zone-detail-main-chart");
    if (!el || typeof am5 === "undefined") return;
    el.innerHTML = "";
    const root = am5.Root.new(el);
    root.setThemes([am5themes_Animated.new(root)]);
    root._logo?.dispose();
    mainRoot = root;

    const colors = getChartColors();

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        layout: root.verticalLayout,
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 8,
        paddingBottom: 4,
      })
    );

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "hourKey",
        renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 40 }),
      })
    );
    xAxis.get("renderer").labels.template.setAll({
      fill: am5.color(colors.axisLabel),
      fontSize: 12,
      fontWeight: "500",
    });
    xAxis.get("renderer").labels.template.adapters.add("text", (_text, target) => {
      const di = target.dataItem;
      return di ? di.dataContext.hour : "";
    });
    xAxis.get("renderer").grid.template.setAll({
      location: 0.5,
      stroke: am5.color(colors.gridStroke),
      strokeOpacity: colors.gridOpacityX,
    });

    const yStay = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        max: 100,
        strictMinMax: true,
        renderer: am5xy.AxisRendererY.new(root, {}),
      })
    );
    yStay.get("renderer").labels.template.setAll({ fill: am5.color(colors.stay), fontSize: 12, fontWeight: "700" });
    yStay.get("renderer").grid.template.setAll({ strokeOpacity: colors.gridOpacityY, stroke: am5.color(colors.gridStroke) });

    const yCong = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        max: 100,
        strictMinMax: true,
        renderer: am5xy.AxisRendererY.new(root, { opposite: true }),
      })
    );
    yCong.get("renderer").labels.template.setAll({ fill: am5.color(colors.crowd), fontSize: 12, fontWeight: "700" });
    yCong.get("renderer").grid.template.setAll({ strokeOpacity: 0 });

    const data = buildSeriesData(row);
    xAxis.data.setAll(data);

    const LineType = am5xy.SmoothedXLineSeries || am5xy.LineSeries;
    const staySeries = chart.series.push(
      LineType.new(root, {
        name: "체류인원",
        xAxis,
        yAxis: yStay,
        valueYField: "people",
        categoryXField: "hourKey",
        stroke: am5.color(colors.stay),
        tooltip: makeTooltip(root, "{name}: {valueY.formatNumber('#.')}", colors.stay),
      })
    );
    staySeries.strokes.template.setAll({ strokeWidth: 2 });
    staySeries.data.setAll(data);

    const congSeries = chart.series.push(
      LineType.new(root, {
        name: "혼잡도",
        xAxis,
        yAxis: yCong,
        valueYField: "density",
        categoryXField: "hourKey",
        stroke: am5.color(colors.crowd),
        tooltip: makeTooltip(root, "{name}: {valueY.formatNumber('#.')}", colors.crowd),
      })
    );
    congSeries.strokes.template.setAll({ strokeWidth: 2 });
    congSeries.data.setAll(data);

    const cursor = chart.set("cursor", am5xy.XYCursor.new(root, { behavior: "none" }));
    cursor.lineY.set("visible", false);
    cursor.lineX.setAll({ stroke: am5.color(colors.cursorStroke), strokeOpacity: colors.cursorOpacity, strokeDasharray: [4, 4] });

    chart.appear(500, 60);
  }

  function createBrushChart(row) {
    const el = document.getElementById("zone-detail-brush-chart");
    if (!el || typeof am5 === "undefined") return;
    el.innerHTML = "";
    const root = am5.Root.new(el);
    root.setThemes([am5themes_Animated.new(root)]);
    root._logo?.dispose();
    brushRoot = root;

    const colors = getChartColors();

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 4,
        paddingBottom: 4,
      })
    );

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "dayKey",
        renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 40 }),
      })
    );
    xAxis.get("renderer").labels.template.setAll({ fill: am5.color(colors.axisLabel), fontSize: 11, fontWeight: "500" });
    xAxis.get("renderer").labels.template.adapters.add("text", (_text, target) => {
      const di = target.dataItem;
      return di && di.dataContext.day ? di.dataContext.day : "";
    });
    xAxis.get("renderer").grid.template.setAll({ strokeOpacity: 0 });
    xAxis.get("renderer").setAll({ strokeOpacity: 0 });

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        max: 110,
        strictMinMax: true,
        renderer: am5xy.AxisRendererY.new(root, {}),
      })
    );
    yAxis.get("renderer").labels.template.setAll({ visible: false });
    yAxis.get("renderer").grid.template.setAll({ strokeOpacity: colors.brushGridOpacity, stroke: am5.color(colors.gridStroke) });
    yAxis.get("renderer").setAll({ strokeOpacity: 0 });

    const data = buildBrushData(row);
    xAxis.data.setAll(data);

    const LineType = am5xy.SmoothedXLineSeries || am5xy.LineSeries;
    const people = chart.series.push(
      LineType.new(root, {
        xAxis,
        yAxis,
        valueYField: "people",
        categoryXField: "dayKey",
        stroke: am5.color(colors.stay),
        fill: am5.color(colors.stay),
      })
    );
    people.strokes.template.setAll({ strokeWidth: 1.5 });
    people.fills.template.setAll({ fillOpacity: 0.28, visible: true });
    people.data.setAll(data);

    const dens = chart.series.push(
      LineType.new(root, {
        xAxis,
        yAxis,
        valueYField: "density",
        categoryXField: "dayKey",
        stroke: am5.color(colors.crowd),
        fill: am5.color(colors.crowd),
      })
    );
    dens.strokes.template.setAll({ strokeWidth: 1.5 });
    dens.fills.template.setAll({ fillOpacity: 0.35, visible: true });
    dens.data.setAll(data);

    applyBrushUi();
    bindBrushInteraction();
    chart.appear(400, 40);
  }

  function renderManagers() {
    if (!managersEl) return;
    managersEl.innerHTML = MANAGERS.map(
      (m) => `<div class="zone-manager">
        <i class="bi bi-person-fill"></i>
        <strong>${m.name}</strong>
        <i class="vdiv"></i>
        <span>${m.phone}</span>
      </div>`
    ).join("");
  }

  function openZoneDetail(row) {
    if (!row) return;
    currentRow = row;
    brushRange = { start: 0.22, end: 0.58 };
    const lv = LEVELS[row.level] || LEVELS.watch;
    if (titleEl) titleEl.textContent = `${row.name} 구역`;
    if (levelEl) {
      levelEl.className = `zone-level ${lv.cls}`;
      levelEl.innerHTML = `<i></i>${lv.label}`;
    }
    renderManagers();
    disposeCharts();
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    placePanel();
    requestAnimationFrame(() => {
      createMainChart(row);
      createBrushChart(row);
    });
  }

  function closeZoneDetail() {
    disposeCharts();
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    if (typeof window.clearZoneListSelection === "function") {
      window.clearZoneListSelection();
    }
  }

  btnClose.addEventListener("click", closeZoneDetail);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeZoneDetail();
  });

  handle.addEventListener("pointerdown", (e) => {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest(".cctv-close")) return;
    const rect = panel.getBoundingClientRect();
    drag = { ox: e.clientX - rect.left, oy: e.clientY - rect.top };
    panel.classList.add("is-dragging");
    handle.setPointerCapture?.(e.pointerId);
  });
  handle.addEventListener("pointermove", (e) => {
    if (!drag) return;
    let left = e.clientX - drag.ox;
    let top = e.clientY - drag.oy;
    const maxL = window.innerWidth - panel.offsetWidth - 8;
    const maxT = window.innerHeight - panel.offsetHeight - 8;
    left = Math.min(Math.max(8, left), Math.max(8, maxL));
    top = Math.min(Math.max(8, top), Math.max(8, maxT));
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
  });
  const endDrag = () => {
    drag = null;
    panel.classList.remove("is-dragging");
  };
  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", endDrag);

  window.addEventListener("themechange", () => {
    if (modal && !modal.hidden && currentRow) {
      disposeCharts();
      createMainChart(currentRow);
      createBrushChart(currentRow);
    }
  });

  window.openZoneDetail = openZoneDetail;
  window.closeZoneDetail = closeZoneDetail;
})();
