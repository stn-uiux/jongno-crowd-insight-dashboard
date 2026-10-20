(function () {
  const mapWidget = document.querySelector(".map-widget");
  const overview = document.getElementById("map-overview");
  const detail = document.getElementById("map-detail");
  const pointsHost = document.getElementById("map-points");
  const btnIkseon = document.getElementById("region-ikseon");
  const btnBack = document.getElementById("map-back");
  if (!mapWidget || !overview || !detail || !pointsHost || !btnIkseon || !btnBack) return;

  /**
   * 개요·상세 공통:
   * - stage: cover로 위젯을 항상 채움
   * - overlay(.map-regions / .map-points): --region-shift-x/y + scale 1
   */
  const MAP_ZOOM = 1;
  const FALLBACK_BASE = { w: 1920, h: 1080 };

  function stageBaseSize(stage, img) {
    const raw = stage.getAttribute("data-aspect");
    if (raw && raw.includes("/")) {
      const [w, h] = raw.split("/").map(Number);
      if (w > 0 && h > 0) return { w, h };
    }
    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      return { w: img.naturalWidth, h: img.naturalHeight };
    }
    return { ...FALLBACK_BASE };
  }

  function fitStage(canvas) {
    if (!canvas || canvas.hidden) return;
    const stage = canvas.querySelector(".map-stage");
    if (!stage) return;
    const img = stage.querySelector(".map-photo");
    const base = stageBaseSize(stage, img);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (cw <= 0 || ch <= 0 || base.w <= 0 || base.h <= 0) return;

    const scale = Math.max(cw / base.w, ch / base.h) * MAP_ZOOM;
    stage.style.width = `${Math.round(base.w * scale)}px`;
    stage.style.height = `${Math.round(base.h * scale)}px`;
    stage.style.setProperty("--region-scale", "1");
    stage.style.setProperty("--region-shift-x", "-5%");
    stage.style.setProperty("--region-shift-y", "0%");
  }

  function fitAllStages() {
    fitStage(overview);
    fitStage(detail);
  }

  function watchStage(canvas) {
    const stage = canvas.querySelector(".map-stage");
    const img = stage && stage.querySelector(".map-photo");
    if (img && !img.complete) {
      img.addEventListener("load", () => fitStage(canvas), { once: true });
    }
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => fitStage(canvas));
      ro.observe(canvas);
    }
  }

  /** Figma 25:1474 — Hitmap 원 중심 (프레임 860×950 기준 %) */
  const POINTS = [
    { id: "A-1", left: 48.5, top: 17.4, state: "attention" },
    { id: "A-2", left: 24.4, top: 25.3, state: "attention" },
    { id: "A-3", left: 49.7, top: 34.3, state: "attention" },
    { id: "A-4", left: 14.5, top: 39.7, state: "attention" },
    { id: "A-5", left: 40.0, top: 50.4, state: "warning" },
    { id: "A-6", left: 66.7, top: 47.7, state: "attention" },
    { id: "A-7", left: 14.1, top: 63.1, state: "warning" },
    { id: "A-8", left: 30.7, top: 63.0, state: "warning" },
    { id: "A-9", left: 76.1, top: 59.3, state: "attention" },
    { id: "A-10", left: 84.3, top: 71.3, state: "attention" },
    { id: "A-11", left: 20.4, top: 85.0, state: "emergency" },
    { id: "A-12", left: 46.9, top: 92.3, state: "warning" },
    { id: "A-13", left: 76.2, top: 83.3, state: "warning" },
  ];

  const STATE_META = {
    attention: {
      label: "관심",
      glow: "assets/map-detail/glow-attention.svg",
      face: `<img src="assets/map-detail/emoji-attention.png" alt="">`,
    },
    warning: {
      label: "경계",
      glow: "assets/map-detail/glow-warning.svg",
      face: `<img src="assets/map-detail/emoji-warning.png" alt="">`,
    },
    emergency: {
      label: "위험",
      glow: "assets/map-detail/glow-emergency.svg",
      face: `<img src="assets/map-detail/emoji-emergency.png" alt="">`,
    },
  };

  function pointHtml(p) {
    const meta = STATE_META[p.state] || STATE_META.attention;
    const warnMark =
      p.state === "emergency"
        ? `<img class="mp-warn" src="assets/map-detail/warn-mark.svg" alt="" width="18" height="16">`
        : "";
    return `
      <div class="map-point is-${p.state}" style="left:${p.left}%;top:${p.top}%;" data-id="${p.id}">
        <div class="mp-tip">
          <div class="mp-tip-card">
            <div class="mp-emo">
              ${meta.face}
              <span class="mp-badge">${meta.label}</span>
            </div>
            <div class="mp-stats">
              <p><span>인원</span><strong>45,600<small>명</small></strong></p>
              <p><span>밀집</span><strong>0.98<small>명/m²</small></strong></p>
            </div>
            <button type="button" class="mp-cctv" title="CCTV" aria-label="${p.id} CCTV" aria-pressed="false">
              <img class="mp-cctv-cam" src="assets/map-detail/icon-cctv.svg" alt="" width="22" height="22">
              <img class="mp-cctv-pause" src="assets/map-detail/icon-cctv-pause.svg" alt="" width="22" height="22" hidden>
            </button>
          </div>
          <i class="mp-tip-arrow" aria-hidden="true"></i>
        </div>
        <div class="mp-core">
          <img class="mp-glow" src="${meta.glow}" alt="">
          ${warnMark}
          <strong class="mp-id">${p.id.replace("-", " - ")}</strong>
        </div>
      </div>`;
  }

  function renderPoints() {
    pointsHost.innerHTML = POINTS.map(pointHtml).join("");
  }

  function openDetail() {
    mapWidget.classList.add("is-detail");
    detail.hidden = false;
    overview.setAttribute("aria-hidden", "true");
    detail.setAttribute("aria-hidden", "false");
    requestAnimationFrame(fitAllStages);
  }

  function closeDetail() {
    mapWidget.classList.remove("is-detail");
    detail.hidden = true;
    overview.setAttribute("aria-hidden", "false");
    detail.setAttribute("aria-hidden", "true");
    requestAnimationFrame(fitAllStages);
  }

  renderPoints();
  watchStage(overview);
  watchStage(detail);
  fitAllStages();
  window.addEventListener("resize", fitAllStages);

  btnIkseon.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openDetail();
  });
  btnBack.addEventListener("click", (e) => {
    e.preventDefault();
    closeDetail();
  });
})();
