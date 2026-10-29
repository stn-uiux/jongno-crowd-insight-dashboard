(function () {
  const charts = [];

  /** Read --text-* / --font-* from the design-system scale in :root (supports rem & px) */
  function typo(token, fallback) {
    let prop = token.startsWith("--") ? token : `--text-${token}`;
    let raw = getComputedStyle(document.documentElement).getPropertyValue(prop).trim() || "";
    let guard = 0;
    while (raw && raw.startsWith("var(") && guard++ < 10) {
      const match = raw.match(/var\(\s*([^,\s)]+)/);
      if (!match) break;
      prop = match[1];
      raw = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
    }
    if (!raw) return fallback;
    const rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    if (raw.endsWith("rem")) {
      const rem = parseFloat(raw);
      return Number.isFinite(rem) ? Math.round(rem * rootFs) : fallback;
    }
    const px = parseFloat(raw);
    return Number.isFinite(px) ? px : fallback;
  }
  const T = {
    xs: () => typo("xs", 10),
    sm: () => typo("sm", 11),
    md: () => typo("md", 12),
    base: () => typo("base", 13),
    lg: () => typo("lg", 14),
    xl: () => typo("xl", 16),
    "2xl": () => typo("2xl", 18),
    "3xl": () => typo("3xl", 24),
  };

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
  const C = {
    white: () => cssHex("--p-white", "#ffffff"),
    textPrimary: () => cssHex("--text-color-primary", "#ffffff"),
    axisTrendY: () => cssHex("--chart-axis-trend-y", "#ffffff"),
    tooltipBg: () => cssHex("--surface-card-dark", "#1a2030"),
    stay: () => cssHex("--chart-stay", "#55adff"),
    crowd: () => cssHex("--chart-crowd", "#25C789"),
    grid: () => cssHex("--chart-grid", "#b4cde6"),
    gridOpacityX: () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--chart-grid-opacity-x")) || 0.22,
    gridOpacityY: () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--chart-grid-opacity-y")) || 0.28,
    axis: () => cssHex("--chart-axis", "#d5deea"),
    visitPast: () => cssHex("--chart-visit-past", "#cee5ff"),
    visitToday: () => cssHex("--chart-visit-today", "#065bac"),
    visitTodayEnd: () => cssHex("--chart-visit-today-end", "#227ed7"),
    congPast: () => cssHex("--chart-cong-past", "#B8EFD5"),
    congToday: () => cssHex("--chart-cong-today", "#16A56F"),
    congTodayEnd: () => cssHex("--chart-cong-today-end", "#25C789"),
    zone1: () => cssHex("--chart-zone-1", "#d42a2a"),
    zone2: () => cssHex("--chart-zone-2", "#ee7c26"),
    zone3: () => cssHex("--chart-zone-3", "#ffce00"),
    zone4: () => cssHex("--chart-zone-4", "#2ad44c"),
    zone5: () => cssHex("--chart-zone-5", "#207dd4"),
    zone5Alt: () => cssHex("--chart-zone-5-alt", "#3d91e0"),
    zone6: () => cssHex("--chart-zone-6", "#883dd4"),
    zone7: () => cssHex("--chart-zone-7", "#f42ccd"),
    zone7Alt: () => cssHex("--chart-zone-7-alt", "#f346d4"),
    trend1: () => cssHex("--chart-trend-1", "#df4749"),
    pieNeutral1: () => cssHex("--chart-pie-neutral-1", "#C6D0DE"),
    pieNeutral2: () => cssHex("--chart-pie-neutral-2", "#8798AF"),
    pieNeutral3: () => cssHex("--chart-pie-neutral-3", "#505F74"),
    pieNeutral4: () => cssHex("--chart-pie-neutral-4", "#151D2A"),
    pieSliceStroke: () => cssHex("--chart-pie-slice-stroke", "#151D2A"),
    levelWatch: () => cssHex("--level-watch", "#1890FF"),
    levelCaution: () => cssHex("--level-caution", "#FAAD14"),
    levelWarning: () => cssHex("--level-warning", "#FA8C16"),
    levelDanger: () => cssHex("--level-danger", "#F5222D"),
  };

  function resizeCharts() {
    charts.forEach((root) => root.resize());
  }
  window.addEventListener("resize", resizeCharts);

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("is-active"));
      tab.classList.add("is-active");
    });
  });

  document.querySelectorAll("[data-select]").forEach((wrap) => {
    const button = wrap.querySelector(".select-btn");
    const menu = wrap.querySelector(".select-menu");
    const label = wrap.querySelector("[data-select-label]");
    button.addEventListener("click", () => {
      const open = wrap.classList.toggle("is-open");
      menu.hidden = !open;
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.querySelectorAll("[role='option']").forEach((option) => {
      option.addEventListener("click", () => {
        label.textContent = option.dataset.value;
        menu.querySelectorAll("[role='option']").forEach((item) => item.classList.remove("is-on"));
        option.classList.add("is-on");
        wrap.classList.remove("is-open");
        menu.hidden = true;
        button.setAttribute("aria-expanded", "false");
        wrap.dispatchEvent(new CustomEvent("selectchange", { detail: { value: option.dataset.value } }));
      });
    });
  });

  // 셀렉트 외부 클릭 시 열린 메뉴 닫기
  document.addEventListener("click", (e) => {
    document.querySelectorAll("[data-select].is-open").forEach((wrap) => {
      if (!wrap.contains(e.target)) {
        wrap.classList.remove("is-open");
        const menu = wrap.querySelector(".select-menu");
        if (menu) menu.hidden = true;
        const button = wrap.querySelector(".select-btn");
        button?.setAttribute("aria-expanded", "false");
      }
    });
  });

  document.getElementById("refresh").addEventListener("click", () => {
    const now = new Date();
    const text = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
    document.getElementById("updated-at").textContent = text;
  });

  function initCharts() {
    charts.forEach((root) => {
      try { root.dispose(); } catch (_) {}
    });
    charts.length = 0;
    charts.push(createPieChart("chart-pie"));
    charts.push(createStayChart("chart-stay"));
    charts.push(createCompareChart("chart-compare"));
    charts.push(createTrendChart("chart-trend"));
  }

  am5.ready(function () {
    initCharts();
  });

  window.addEventListener("themechange", function () {
    initCharts();
  });

  function createRoot(id) {
    const root = am5.Root.new(id);
    root.setThemes([am5themes_Animated.new(root)]);
    root._logo?.dispose();
    root.container.set("fontFamily", "Pretendard, sans-serif");
    return root;
  }

  /** Series color tooltip ? no border, translucent fill (all charts) */
  function makeTooltip(root, labelText, color, opts = {}) {
    const fromSprite = opts.fromSprite === true;
    const tooltip = am5.Tooltip.new(root, {
      labelText,
      getFillFromSprite: fromSprite,
      getStrokeFromSprite: false,
      autoTextColor: true,
      paddingTop: 6,
      paddingBottom: 6,
      paddingLeft: 10,
      paddingRight: 10,
    });
    const bg = tooltip.get("background");
    bg.setAll({
      fillOpacity: 0.72,
      strokeOpacity: 0,
      strokeWidth: 0,
    });
    if (!fromSprite) {
      bg.set("fill", am5.color(color ?? C.tooltipBg()));
    }
    bg.adapters.add("strokeOpacity", () => 0);
    bg.adapters.add("fillOpacity", () => 0.72);
    tooltip.label.setAll({
      fontFamily: "Pretendard, sans-serif",
      fontSize: T.md(),
      fontWeight: "700",
    });
    return tooltip;
  }

  /** XY 라인/바 호버 툴팁 — 커서 없으면 거의 안 뜸 */
  function attachHoverCursor(chart, root) {
    const cursor = chart.set(
      "cursor",
      am5xy.XYCursor.new(root, {
        behavior: "none",
      })
    );
    cursor.lineY.set("visible", false);
    cursor.lineX.setAll({
      stroke: am5.color(C.white()),
      strokeOpacity: 0.22,
      strokeDasharray: [4, 4],
    });
    return cursor;
  }

  function createPieChart(id) {
    const root = createRoot(id);
    const chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        layout: root.verticalLayout,
        innerRadius: am5.percent(70),
        radius: am5.percent(78),
        paddingTop: 10,
        paddingBottom: 8,
        paddingLeft: 8,
        paddingRight: 8,
      })
    );

    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: "value",
        categoryField: "category",
        alignLabels: false,
      })
    );

    series.labels.template.setAll({
      text: "{valuePercentTotal}%",
      textType: "regular",
      fontSize: T.md(),
      fontWeight: "700",
      fontFamily: "Pretendard, sans-serif",
      fill: am5.color(C.textPrimary()),
      radius: 18,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 2,
      paddingRight: 2,
      maxWidth: 48,
      oversizedBehavior: "none",
      populateText: true,
    });
    series.labels.template.adapters.add("text", (_text, target) => {
      const pct = target.dataItem?.get("valuePercentTotal");
      return pct == null ? "" : `${Math.round(pct)}%`;
    });
    series.ticks.template.setAll({
      visible: true,
      strokeOpacity: 0.9,
      strokeWidth: 1.5,
    });
    series.ticks.template.adapters.add("stroke", (stroke, target) =>
      am5.color(target.dataItem?.dataContext?.color || C.white())
    );
    series.ticks.template.adapters.add("points", (points) => {
      if (!points || points.length < 2) return points;
      const p0 = points[0];
      const pEnd = points[points.length - 1];
      const dx = pEnd.x - p0.x;
      const dy = pEnd.y - p0.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 2) return points;
      // 선이 글자 중심까지 닿아 겹치지 않도록, 슬라이스에서 바깥으로 7px만 뻗게 제한하여 글자와의 여백 확보
      const tickLen = Math.min(7, Math.max(3, dist - 10));
      const endX = p0.x + (dx / dist) * tickLen;
      const endY = p0.y + (dy / dist) * tickLen;
      return [p0, { x: endX, y: endY }];
    });
    series.set(
      "tooltip",
      makeTooltip(root, "{category}: {valuePercentTotal}%", null, { fromSprite: true })
    );
    series.slices.template.setAll({
      templateField: "sliceSettings",
      strokeOpacity: 0,
      strokeWidth: 0,
      cornerRadius: 2,
      tooltipText: "{category}: {valuePercentTotal}%",
    });
    series.slices.template.adapters.add("tooltipText", (_text, target) => {
      const ctx = target.dataItem?.dataContext;
      const pct = target.dataItem?.get("valuePercentTotal");
      if (!ctx || pct == null) return "";
      return `${ctx.category}: ${Math.round(pct)}%`;
    });
    series.slices.template.adapters.add("fill", (fill, target) => {
      const c = target.dataItem?.dataContext?.color;
      return c ? am5.color(c) : fill;
    });

    // 현재 구역별 상태: 헌법=위험(Red), 광화문=관심(Blue), 낙원동=정상(Neutral-3), 익선동=경계(Orange)
    const PIE_ZONE_STATUS = {
      "헌법 재판소일대": "위험",
      "광화문 광장 접점": "관심",
      "낙원동": null,
      "익선동": "경계",
    };

    function resolveZoneColor(zoneName, defaultNeutralColor) {
      const status = PIE_ZONE_STATUS[zoneName];
      if (status === "위험") return C.levelDanger();
      if (status === "경계") return C.levelWarning();
      if (status === "주의") return C.levelCaution();
      if (status === "관심") return C.levelWatch();
      return defaultNeutralColor;
    }

    // 범례 닷(dot) 상태 동기화
    document.querySelectorAll(".pie-legend li").forEach((li) => {
      const zone = li.dataset.zone;
      const dot = li.querySelector(".dot");
      if (!dot || !zone) return;
      const st = PIE_ZONE_STATUS[zone];
      dot.className = "dot";
      if (st === "위험") dot.classList.add("status-danger");
      else if (st === "경계") dot.classList.add("status-warning");
      else if (st === "주의") dot.classList.add("status-caution");
      else if (st === "관심") dot.classList.add("status-watch");
      else {
        if (zone === "헌법 재판소일대") dot.classList.add("neutral-1");
        else if (zone === "광화문 광장 접점") dot.classList.add("neutral-2");
        else if (zone === "낙원동") dot.classList.add("neutral-3");
        else if (zone === "익선동") dot.classList.add("neutral-4");
      }
    });

    const c1 = resolveZoneColor("헌법 재판소일대", C.pieNeutral1());
    const c2 = resolveZoneColor("광화문 광장 접점", C.pieNeutral2());
    const c3 = resolveZoneColor("낙원동",          C.pieNeutral3());
    const c4 = resolveZoneColor("익선동",          C.pieNeutral4());

    series.data.setAll([
      { category: "헌법 재판소일대", value: 40, color: c1, sliceSettings: { fill: am5.color(c1) } },
      { category: "광화문 광장 접점", value: 16, color: c2, sliceSettings: { fill: am5.color(c2) } },
      { category: "낙원동",          value: 10, color: c3, sliceSettings: { fill: am5.color(c3) } },
      { category: "익선동",          value: 34, color: c4, sliceSettings: { fill: am5.color(c4) } },
    ]);

    chart.seriesContainer.children.push(
      am5.Label.new(root, {
        html: `<div class="pie-center-label"><strong>80,007</strong><span>체류 인원(명)</span></div>`,
        centerX: am5.percent(50),
        centerY: am5.percent(50),
      })
    );

    series.appear(700, 80);
    chart.appear(700, 80);
    return root;
  }

  const STAY_ZONE_DATA = {
    "A구역": [
      { hour: "10시", stay: 280, cong: 32 },
      { hour: "11시", stay: 210, cong: 48 },
      { hour: "12시", stay: 360, cong: 58 },
      { hour: "13시", stay: 190, cong: 42 },
      { hour: "14시", stay: 120, cong: 28 },
      { hour: "15시", stay: 250, cong: 72 },
      { hour: "16시", stay: 210, cong: 68 },
    ],
    "B구역": [
      { hour: "10시", stay: 190, cong: 26 },
      { hour: "11시", stay: 240, cong: 36 },
      { hour: "12시", stay: 310, cong: 52 },
      { hour: "13시", stay: 220, cong: 39 },
      { hour: "14시", stay: 160, cong: 30 },
      { hour: "15시", stay: 280, cong: 64 },
      { hour: "16시", stay: 250, cong: 58 },
    ],
    "C구역": [
      { hour: "10시", stay: 140, cong: 20 },
      { hour: "11시", stay: 180, cong: 28 },
      { hour: "12시", stay: 230, cong: 38 },
      { hour: "13시", stay: 170, cong: 25 },
      { hour: "14시", stay: 130, cong: 22 },
      { hour: "15시", stay: 200, cong: 46 },
      { hour: "16시", stay: 190, cong: 42 },
    ],
    "D구역": [
      { hour: "10시", stay: 320, cong: 42 },
      { hour: "11시", stay: 350, cong: 56 },
      { hour: "12시", stay: 390, cong: 72 },
      { hour: "13시", stay: 300, cong: 52 },
      { hour: "14시", stay: 230, cong: 39 },
      { hour: "15시", stay: 340, cong: 82 },
      { hour: "16시", stay: 310, cong: 76 },
    ],
  };

  function createStayChart(id) {
    const root = createRoot(id);
    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        layout: root.verticalLayout,
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 10,
        paddingBottom: 0,
      })
    );

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "hour",
        renderer: am5xy.AxisRendererX.new(root, {
          minGridDistance: 30,
        }),
      })
    );
    xAxis.get("renderer").labels.template.setAll({
      fill: am5.color(C.axis()),
      fontSize: T.base(),
      fontWeight: "500",
    });
    xAxis.get("renderer").grid.template.setAll({
      location: 0.5,
      stroke: am5.color(C.grid()),
      strokeOpacity: C.gridOpacityX(),
    });

    const yStay = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        max: 400,
        strictMinMax: true,
        renderer: am5xy.AxisRendererY.new(root, {}),
      })
    );
    yStay.get("renderer").labels.template.setAll({
      fill: am5.color(C.stay()),
      fontSize: T.base(),
      fontWeight: "700",
    });
    yStay.get("renderer").grid.template.setAll({
      stroke: am5.color(C.grid()),
      strokeOpacity: C.gridOpacityY(),
    });

    const yCong = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        max: 100,
        strictMinMax: true,
        renderer: am5xy.AxisRendererY.new(root, { opposite: true }),
      })
    );
    yCong.get("renderer").labels.template.setAll({
      fill: am5.color(C.crowd()),
      fontSize: T.base(),
      fontWeight: "700",
    });
    yCong.get("renderer").grid.template.setAll({ strokeOpacity: 0 });

    const staySelect = document.querySelector(".stay-widget [data-select]");
    const initialZone = staySelect?.querySelector("[data-select-label]")?.textContent?.trim() || "A구역";
    const data = STAY_ZONE_DATA[initialZone] || STAY_ZONE_DATA["A구역"];
    xAxis.data.setAll(data);

    const staySeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: "\uCCB4\uB958\uC778\uC6D0",
        xAxis,
        yAxis: yStay,
        valueYField: "stay",
        categoryXField: "hour",
        stroke: am5.color(C.stay()),
        fill: am5.color(C.stay()),
        tooltip: makeTooltip(root, "{name}: {valueY}", C.stay()),
      })
    );
    staySeries.strokes.template.setAll({
      strokeWidth: 2,
      stroke: am5.color(C.stay()),
    });
    staySeries.bullets.push(() =>
      am5.Bullet.new(root, {
        sprite: am5.Circle.new(root, {
          radius: 4.2,
          fill: am5.color(C.white()),
          stroke: am5.color(C.stay()),
          strokeWidth: 2,
        }),
      })
    );
    staySeries.data.setAll(data);

    const congSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: "\uD63C\uC7A1\uB3C4",
        xAxis,
        yAxis: yCong,
        valueYField: "cong",
        categoryXField: "hour",
        stroke: am5.color(C.crowd()),
        fill: am5.color(C.crowd()),
        tooltip: makeTooltip(root, "{name}: {valueY}", C.crowd()),
      })
    );
    congSeries.strokes.template.setAll({
      strokeWidth: 2,
      stroke: am5.color(C.crowd()),
    });
    congSeries.bullets.push(() =>
      am5.Bullet.new(root, {
        sprite: am5.Circle.new(root, {
          radius: 4.2,
          fill: am5.color(C.white()),
          stroke: am5.color(C.crowd()),
          strokeWidth: 2,
        }),
      })
    );
    congSeries.data.setAll(data);

    attachHoverCursor(chart, root);

    if (staySelect) {
      const onZoneChange = (e) => {
        const zone = e.detail?.value;
        const nextData = STAY_ZONE_DATA[zone] || STAY_ZONE_DATA["A구역"];
        xAxis.data.setAll(nextData);
        staySeries.data.setAll(nextData);
        congSeries.data.setAll(nextData);
      };
      staySelect.addEventListener("selectchange", onZoneChange);
      root.events.on("disposed", () => {
        staySelect.removeEventListener("selectchange", onZoneChange);
      });
    }

    staySeries.appear(700);
    congSeries.appear(700);
    chart.appear(700, 80);
    return root;
  }

  function createCompareChart(id) {
    const root = createRoot(id);
    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        layout: root.verticalLayout,
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 10,
        paddingBottom: 0,
      })
    );

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "category",
        renderer: am5xy.AxisRendererX.new(root, {
          minGridDistance: 80,
          cellStartLocation: 0.25,
          cellEndLocation: 0.75,
        }),
      })
    );
    xAxis.get("renderer").labels.template.setAll({
      fill: am5.color(C.textPrimary()),
      fontSize: T.lg(),
      fontWeight: "700",
      centerX: am5.p50,
      paddingTop: 8,
    });
    xAxis.get("renderer").grid.template.setAll({ strokeOpacity: 0 });

    const yLeft = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        max: 400,
        strictMinMax: true,
        renderer: am5xy.AxisRendererY.new(root, { minGridDistance: 36 }),
      })
    );
    yLeft.get("renderer").labels.template.setAll({
      fill: am5.color(C.stay()),
      fontSize: T.base(),
      fontWeight: "700",
      centerY: am5.p50,
    });
    yLeft.get("renderer").grid.template.setAll({
      stroke: am5.color(C.grid()),
      strokeOpacity: C.gridOpacityY(),
    });

    const yRight = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        max: 100,
        strictMinMax: true,
        renderer: am5xy.AxisRendererY.new(root, {
          opposite: true,
          minGridDistance: 36,
        }),
      })
    );
    yRight.get("renderer").labels.template.setAll({
      fill: am5.color(C.crowd()),
      fontSize: T.base(),
      fontWeight: "700",
      centerY: am5.p50,
    });
    yRight.get("renderer").grid.template.setAll({ strokeOpacity: 0 });

    xAxis.data.setAll([{ category: "\uBC29\uBB38\uC778\uC6D0" }, { category: "\uD63C\uC7A1\uB3C4" }]);

    const BAR_W = 28;
    const BAR_GAP = 8;
    const DX = (BAR_W + BAR_GAP) / 2;

    function makeColumn(name, yAxis, color, data, gradientTo, dx) {
      const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
          name,
          xAxis,
          yAxis,
          valueYField: "value",
          categoryXField: "category",
          fill: am5.color(color),
          stroke: am5.color(color),
          clustered: false,
          tooltip: makeTooltip(root, "{name}: {valueY}", color),
        })
      );
      series.columns.template.setAll({
        width: BAR_W,
        dx,
        centerX: am5.p50,
        cornerRadiusTL: 6,
        cornerRadiusTR: 6,
        strokeOpacity: 0,
      });
      if (gradientTo) {
        series.columns.template.set(
          "fillGradient",
          am5.LinearGradient.new(root, {
            stops: [{ color: am5.color(color) }, { color: am5.color(gradientTo) }],
            rotation: 90,
          })
        );
      }
      series.data.setAll(data);
      return series;
    }

    makeColumn("\uC5B4\uC81C \uBC29\uBB38", yLeft, C.visitPast(), [{ category: "\uBC29\uBB38\uC778\uC6D0", value: 220 }], null, -DX);
    makeColumn("\uC624\uB298 \uBC29\uBB38", yLeft, C.visitToday(), [{ category: "\uBC29\uBB38\uC778\uC6D0", value: 300 }], C.visitTodayEnd(), DX);
    makeColumn("\uC5B4\uC81C \uD63C\uC7A1", yRight, C.congPast(), [{ category: "\uD63C\uC7A1\uB3C4", value: 18 }], null, -DX);
    makeColumn("\uC624\uB298 \uD63C\uC7A1", yRight, C.congToday(), [{ category: "\uD63C\uC7A1\uB3C4", value: 28 }], C.congTodayEnd(), DX);

    chart.series.each((series) => series.appear(700));
    chart.appear(700, 80);
    return root;
  }

  function createTrendChart(id) {
    const root = createRoot(id);
    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        layout: root.verticalLayout,
        paddingLeft: 0,
        paddingRight: 4,
        paddingTop: 10,
        paddingBottom: 0,
      })
    );

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "hour",
        renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 36 }),
      })
    );
    xAxis.get("renderer").labels.template.setAll({
      fill: am5.color(C.axis()),
      fontSize: T.base(),
      fontWeight: "500",
    });
    xAxis.get("renderer").grid.template.setAll({
      location: 0.5,
      stroke: am5.color(C.grid()),
      strokeOpacity: C.gridOpacityX(),
    });

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        max: 800,
        strictMinMax: true,
        renderer: am5xy.AxisRendererY.new(root, {}),
      })
    );
    yAxis.get("renderer").labels.template.setAll({
      fill: am5.color(C.axisTrendY()),
      fontSize: T.base(),
      fontWeight: "700",
    });
    yAxis.get("renderer").grid.template.setAll({
      stroke: am5.color(C.grid()),
      strokeOpacity: C.gridOpacityY(),
    });

    const data = [
      { hour: "04\uC2DC", ikseon: 620, insa: 280, gwang: 520, cheong: 160, jongno: 390, chang: 470 },
      { hour: "05\uC2DC", ikseon: 180, insa: 470, gwang: 600, cheong: 120, jongno: 520, chang: 260 },
      { hour: "06\uC2DC", ikseon: 520, insa: 680, gwang: 120, cheong: 380, jongno: 430, chang: 560 },
      { hour: "07\uC2DC", ikseon: 250, insa: 340, gwang: 430, cheong: 520, jongno: 310, chang: 700 },
      { hour: "08\uC2DC", ikseon: 120, insa: 480, gwang: 560, cheong: 360, jongno: 220, chang: 420 },
      { hour: "09\uC2DC", ikseon: 540, insa: 220, gwang: 360, cheong: 180, jongno: 280, chang: 160 },
      { hour: "10\uC2DC", ikseon: 380, insa: 410, gwang: 300, cheong: 140, jongno: 330, chang: 360 },
    ];
    xAxis.data.setAll(data);

    const lines = [
      { name: "\uC775\uC120\uB3D9 \uD55C\uC625 \uAC70\uB9AC", field: "ikseon", color: C.trend1() },
      { name: "\uC778\uC0AC\uB3D9", field: "insa", color: C.zone2() },
      { name: "\uAD11\uD654\uBB38 \uAD11\uC7A5", field: "gwang", color: C.zone3() },
      { name: "\uCCAD\uACC4\uCC9C", field: "cheong", color: C.zone4() },
      { name: "\uC885\uB85C3\uAC00\uC5ED", field: "jongno", color: C.zone5Alt() },
      { name: "\uCC3D\uB355\uAD81", field: "chang", color: C.zone7Alt() },
    ];

    lines.forEach((line) => {
      const series = chart.series.push(
        am5xy.LineSeries.new(root, {
          name: line.name,
          xAxis,
          yAxis,
          valueYField: line.field,
          categoryXField: "hour",
          stroke: am5.color(line.color),
          fill: am5.color(line.color),
          tooltip: makeTooltip(root, "{name}: {valueY}", line.color),
        })
      );
      series.strokes.template.setAll({ strokeWidth: 2, stroke: am5.color(line.color) });
      series.data.setAll(data);
      series.appear(700);
    });

    attachHoverCursor(chart, root);
    chart.appear(700, 80);
    return root;
  }
})();
