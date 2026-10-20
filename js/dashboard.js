(function () {
  const charts = [];

  /** Read --text-* / --font-* from the design-system scale in :root */
  function typo(token, fallback) {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(token.startsWith("--") ? token : `--text-${token}`)
      .trim();
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

  /** CSS color token ? amcharts hex number */
  function cssHex(token, fallback) {
    const raw =
      getComputedStyle(document.documentElement)
        .getPropertyValue(token.startsWith("--") ? token : `--${token}`)
        .trim() || fallback;
    const hex = raw.replace(/^#/, "");
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
    stay: () => cssHex("--chart-stay", "#55adff"),
    crowd: () => cssHex("--chart-crowd", "#25d08e"),
    grid: () => cssHex("--chart-grid", "#b4cde6"),
    axis: () => cssHex("--chart-axis", "#d5deea"),
    visitPast: () => cssHex("--chart-visit-past", "#cee5ff"),
    visitToday: () => cssHex("--chart-visit-today", "#065bac"),
    visitTodayEnd: () => cssHex("--chart-visit-today-end", "#227ed7"),
    congPast: () => cssHex("--chart-cong-past", "#d7f4e2"),
    congToday: () => cssHex("--chart-cong-today", "#00aea0"),
    congTodayEnd: () => cssHex("--chart-cong-today-end", "#25d08e"),
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
      });
    });
  });

  document.getElementById("refresh").addEventListener("click", () => {
    const now = new Date();
    const text = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
    document.getElementById("updated-at").textContent = text;
  });

  am5.ready(function () {
    charts.push(createPieChart("chart-pie"));
    charts.push(createStayChart("chart-stay"));
    charts.push(createCompareChart("chart-compare"));
    charts.push(createTrendChart("chart-trend"));
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
      bg.set("fill", am5.color(color ?? 0x1a2030));
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
      stroke: am5.color(0xffffff),
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
        innerRadius: am5.percent(72),
        radius: am5.percent(82),
        paddingTop: 8,
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
      fill: am5.color(0xffffff),
      radius: 16,
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
      strokeOpacity: 0.85,
      strokeWidth: 1.5,
      length: 10,
    });
    series.ticks.template.adapters.add("stroke", (stroke, target) =>
      am5.color(target.dataItem?.dataContext?.color || 0xffffff)
    );
    series.set(
      "tooltip",
      makeTooltip(root, "{category}: {valuePercentTotal}%", null, { fromSprite: true })
    );
    series.slices.template.setAll({
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
    series.slices.template.adapters.add("fill", (fill, target) =>
      am5.color(target.dataItem?.dataContext?.color || fill)
    );

    series.data.setAll([
      { category: "\uC775\uC120\uB3D9 \uD55C\uC625 \uAC70\uB9AC", value: 8, color: C.zone1() },
      { category: "\uC778\uC0AC\uB3D9", value: 15, color: C.zone2() },
      { category: "\uAD11\uD654\uBB38 \uAD11\uC7A5", value: 12, color: C.zone3() },
      { category: "\uCCAD\uACC4\uCC9C", value: 19, color: C.zone4() },
      { category: "\uC885\uB85C3\uAC00\uC5ED", value: 22, color: C.zone5() },
      { category: "\uD0D1\uACE8\uACF5\uC6D0", value: 7, color: C.zone6() },
      { category: "\uCC3D\uB355\uAD81", value: 17, color: C.zone7() },
    ]);

    chart.seriesContainer.children.push(
      am5.Label.new(root, {
        html: `<div style="text-align:center;color:#fff;line-height:1.15;font-family:Pretendard,sans-serif"><strong style="font-size:${T["3xl"]()}px;font-weight:900">80,007</strong><br><span style="font-size:${T.lg()}px;opacity:0.5">\uCCB4\uB958 \uC778\uC6D0(\uBA85)</span></div>`,
        centerX: am5.percent(50),
        centerY: am5.percent(50),
      })
    );

    series.appear(700, 80);
    chart.appear(700, 80);
    return root;
  }

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
        paddingTop: 8,
        paddingBottom: 0,
      })
    );

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "hour",
        renderer: am5xy.AxisRendererX.new(root, {
          minGridDistance: 30,
          cellStartLocation: 0.1,
          cellEndLocation: 0.9,
        }),
      })
    );
    xAxis.get("renderer").labels.template.setAll({
      fill: am5.color(C.axis()),
      fontSize: T.base(),
      fontWeight: "500",
    });
    xAxis.get("renderer").grid.template.setAll({ strokeOpacity: 0 });

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
      strokeOpacity: 0.28,
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

    const data = [
      { hour: "10\uC2DC", stay: 280, cong: 32 },
      { hour: "11\uC2DC", stay: 210, cong: 48 },
      { hour: "12\uC2DC", stay: 360, cong: 58 },
      { hour: "13\uC2DC", stay: 190, cong: 42 },
      { hour: "14\uC2DC", stay: 120, cong: 28 },
      { hour: "15\uC2DC", stay: 250, cong: 72 },
      { hour: "16\uC2DC", stay: 210, cong: 68 },
    ];
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
          fill: am5.color(0xffffff),
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
          fill: am5.color(0xffffff),
          stroke: am5.color(C.crowd()),
          strokeWidth: 2,
        }),
      })
    );
    congSeries.data.setAll(data);

    attachHoverCursor(chart, root);
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
        paddingTop: 4,
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
      fill: am5.color(0xffffff),
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
      strokeOpacity: 0.28,
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

    makeColumn("\uC9C0\uB09C\uC8FC \uBC29\uBB38", yLeft, C.visitPast(), [{ category: "\uBC29\uBB38\uC778\uC6D0", value: 220 }], null, -DX);
    makeColumn("\uC624\uB298 \uBC29\uBB38", yLeft, C.visitToday(), [{ category: "\uBC29\uBB38\uC778\uC6D0", value: 300 }], C.visitTodayEnd(), DX);
    makeColumn("\uC9C0\uB09C\uC8FC \uD63C\uC7A1", yRight, C.congPast(), [{ category: "\uD63C\uC7A1\uB3C4", value: 18 }], null, -DX);
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
        paddingTop: 4,
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
      stroke: am5.color(0x96b9dc),
      strokeOpacity: 0.22,
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
      fill: am5.color(0x8ea0b8),
      fontSize: T.base(),
      fontWeight: "700",
    });
    yAxis.get("renderer").grid.template.setAll({
      stroke: am5.color(0x96b9dc),
      strokeOpacity: 0.28,
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
