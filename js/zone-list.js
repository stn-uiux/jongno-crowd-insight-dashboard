(function () {
  const body = document.getElementById("zone-list-body");
  const sortRoot = document.querySelector(".zone-sort");
  if (!body || !sortRoot) return;

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

  const ROWS = [
    { name: "A - 4", level: "danger", density: 0.98, people: 47500, trend: [0.62, 0.7, 0.66, 0.78, 0.84, 0.9, 0.86, 0.94, 0.98] },
    { name: "A - 5", level: "danger", density: 0.95, people: 46200, trend: [0.55, 0.6, 0.72, 0.68, 0.8, 0.76, 0.88, 0.92, 0.95] },
    { name: "B - 2", level: "warning", density: 0.9, people: 44100, trend: [0.48, 0.52, 0.6, 0.58, 0.7, 0.74, 0.8, 0.86, 0.9] },
    { name: "A - 2", level: "caution", density: 0.84, people: 41800, trend: [0.4, 0.46, 0.5, 0.58, 0.55, 0.66, 0.72, 0.78, 0.84] },
    { name: "A - 1", level: "watch", density: 0.72, people: 38600, trend: [0.35, 0.4, 0.38, 0.48, 0.52, 0.58, 0.62, 0.68, 0.72] },
    { name: "C - 3", level: "caution", density: 0.81, people: 40200, trend: [0.42, 0.5, 0.47, 0.56, 0.6, 0.68, 0.7, 0.76, 0.81] },
    { name: "D - 1", level: "warning", density: 0.88, people: 42900, trend: [0.5, 0.55, 0.62, 0.6, 0.7, 0.75, 0.82, 0.85, 0.88] },
    { name: "B - 5", level: "danger", density: 0.93, people: 45500, trend: [0.58, 0.64, 0.7, 0.75, 0.8, 0.85, 0.88, 0.91, 0.93] },
  ];

  let sortKey = "name";
  let sortDir = 1;

  let sparkUid = 0;
  function sparkSvg(values) {
    const w = 140;
    const h = 28;
    const pad = 2;
    const gid = `zone-spark-fill-${++sparkUid}`;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(0.01, max - min);
    const pts = values.map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return [x, y];
    });
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;
    return `<svg class="zone-spark" viewBox="0 0 ${w} ${h}" aria-hidden="true">
      <defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--chart-crowd, #25C789)" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="var(--chart-crowd, #25C789)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#${gid})"/>
      <path d="${line}" fill="none" stroke="var(--chart-crowd, #25C789)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function sortedRows() {
    const rows = ROWS.slice();
    rows.sort((a, b) => {
      let av;
      let bv;
      if (sortKey === "density") {
        av = a.density;
        bv = b.density;
      } else if (sortKey === "people") {
        av = a.people;
        bv = b.people;
      } else {
        av = a.name;
        bv = b.name;
      }
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
    return rows;
  }

  let selectedName = null;

  function render() {
    body.innerHTML = sortedRows()
      .map((row) => {
        const lv = LEVELS[row.level] || LEVELS.watch;
        const on = selectedName === row.name ? " is-selected" : "";
        return `<tr class="${on.trim()}" data-zone-name="${row.name}" tabindex="0">
          <td><span class="zone-name">${row.name}</span></td>
          <td><span class="zone-level ${lv.cls}"><i></i>${lv.label}</span></td>
          <td><span class="zone-density">${row.density.toFixed(2)}</span></td>
          <td><span class="zone-people">${row.people.toLocaleString("ko-KR")}</span></td>
          <td>${sparkSvg(row.trend)}</td>
        </tr>`;
      })
      .join("");
  }

  function selectAndOpen(name) {
    const row = ROWS.find((r) => r.name === name);
    if (!row) return;
    selectedName = name;
    body.querySelectorAll("tr").forEach((tr) => {
      tr.classList.toggle("is-selected", tr.dataset.zoneName === name);
    });
    if (typeof window.openZoneDetail === "function") {
      window.openZoneDetail(row);
    }
  }

  body.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-zone-name]");
    if (!tr) return;
    selectAndOpen(tr.dataset.zoneName);
  });

  body.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const tr = e.target.closest("tr[data-zone-name]");
    if (!tr) return;
    e.preventDefault();
    selectAndOpen(tr.dataset.zoneName);
  });

  sortRoot.querySelectorAll(".zone-sort-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.sort;
      if (sortKey === key) sortDir *= -1;
      else {
        sortKey = key;
        sortDir = key === "name" ? 1 : -1;
      }
      sortRoot.querySelectorAll(".zone-sort-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
      render();
    });
  });

  window.clearZoneListSelection = function () {
    selectedName = null;
    body.querySelectorAll("tr.is-selected").forEach((tr) => {
      tr.classList.remove("is-selected");
    });
  };

  render();
})();
