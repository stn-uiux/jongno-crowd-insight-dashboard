(function () {
  const mapWidget = document.querySelector(".map-widget");
  const overview = document.getElementById("map-overview");
  const detail = document.getElementById("map-detail");
  const detailPhoto = detail ? detail.querySelector(".map-photo-detail") : null;
  const pointsHost = document.getElementById("map-points");
  const regionBtns = document.querySelectorAll(".map-regions .region[data-region]");
  const btnBack = document.getElementById("map-back");
  if (!mapWidget || !overview || !detail || !pointsHost || !regionBtns.length || !btnBack) return;

  /** 구역별 상세 지도 이미지 매핑 */
  const REGION_DETAIL_MAP = {
    A: { name: "익선동", src: "assets/map_detail_1.png" },
    B: { name: "헌법 재판소 일대", src: "assets/map_detail_2.png" },
    C: { name: "낙원동", src: "assets/map_detail_3.png" },
    D: { name: "광화문 광장 접점", src: "assets/map_detail_4.png" },
  };

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

  /**
   * Figma 25:1474 — Hitmap 원 중심 (프레임 860×950 기준 %)
   * - state  : "normal"(정상) | "attention"(관심) | "caution"(주의) | "warning"(경계) | "emergency"(심각)
   * - tipPos : "top"(기본, 위) | "bottom"(아래) | "left"(왼쪽) | "right"(오른쪽)
   * - cctvPos: "right" (기본, 우측 상단) | "left" (좌측 상단)
   */
  const POINTS = [
    { id: "A-1", left: 48.5, top: 17.4, state: "attention", tipPos: "top", cctvPos: "right" },
    { id: "A-2", left: 24.4, top: 25.3, state: "normal", tipPos: "top", cctvPos: "right" },
    { id: "A-3", left: 49.7, top: 34.3, state: "attention", tipPos: "top", cctvPos: "right" },
    { id: "A-4", left: 14.5, top: 39.7, state: "caution", tipPos: "top", cctvPos: "right" },
    { id: "A-5", left: 40.0, top: 50.4, state: "warning", tipPos: "top", cctvPos: "right" },
    { id: "A-6", left: 66.7, top: 47.7, state: "attention", tipPos: "top", cctvPos: "right" },
    { id: "A-7", left: 14.1, top: 63.1, state: "warning", tipPos: "top", cctvPos: "right" },
    { id: "A-8", left: 30.7, top: 63.0, state: "warning", tipPos: "top", cctvPos: "right" },
    { id: "A-9", left: 76.1, top: 59.3, state: "normal", tipPos: "top", cctvPos: "right" },
    { id: "A-10", left: 84.3, top: 71.3, state: "caution", tipPos: "top", cctvPos: "right" },
    { id: "A-11", left: 20.4, top: 85.0, state: "emergency", tipPos: "top", cctvPos: "right" },
    { id: "A-12", left: 46.9, top: 92.3, state: "warning", tipPos: "top", cctvPos: "right" },
    { id: "A-13", left: 76.2, top: 83.3, state: "warning", tipPos: "top", cctvPos: "right" },
  ];

  const STATE_META = {
    normal: {
      label: "정상",
      glow: "assets/map-detail/glow-normal.svg",
      emoji: "assets/map-detail/emoji-normal.png",
    },
    attention: {
      label: "관심",
      glow: "assets/map-detail/glow-attention.svg",
      emoji: "assets/map-detail/emoji-attention.png",
    },
    caution: {
      label: "주의",
      glow: "assets/map-detail/glow-caution.svg",
      emoji: "assets/map-detail/emoji-caution.png",
    },
    warning: {
      label: "경계",
      glow: "assets/map-detail/glow-warning.svg",
      emoji: "assets/map-detail/emoji-warning.png",
    },
    emergency: {
      label: "심각",
      glow: "assets/map-detail/glow-emergency.svg",
      emoji: "assets/map-detail/emoji-emergency.png",
    },
  };

  const VALID_TIP_POS = new Set(["top", "bottom", "left", "right"]);

  function pointHtml(p) {
    const stateKey = STATE_META[p.state] ? p.state : "attention";
    const meta = STATE_META[stateKey];
    const tipPos = VALID_TIP_POS.has(p.tipPos) ? p.tipPos : "top";
    const cctvPos = p.cctvPos === "left" ? "left" : "right";
    return `
      <div class="map-point is-${stateKey}" style="left:${p.left}%;top:${p.top}%;" data-id="${p.id}">
        <div class="mp-tip mp-tip--${tipPos} mp-tip--cctv-${cctvPos}">
          <div class="mp-tip-card">
            <div class="mp-emo">
              <span class="mp-emo-icon" role="img" aria-label="${meta.label}"></span>
              <span class="mp-badge"></span>
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
          <span class="mp-glow" aria-hidden="true"></span>
          <img class="mp-warn" src="assets/map-detail/warn-mark.svg" alt="" width="18" height="16">
          <strong class="mp-id">${p.id.replace("-", " - ")}</strong>
        </div>
      </div>`;
  }

  function renderPoints() {
    pointsHost.innerHTML = POINTS.map(pointHtml).join("");
  }

  function openDetail(regionKey = "A", customSrc) {
    const key = String(regionKey || "A").toUpperCase();
    const info = REGION_DETAIL_MAP[key] || REGION_DETAIL_MAP.A;
    const targetSrc = customSrc || info.src;

    if (detailPhoto && targetSrc) {
      if (detailPhoto.getAttribute("src") !== targetSrc) {
        detailPhoto.setAttribute("src", targetSrc);
        detailPhoto.addEventListener("load", () => fitStage(detail), { once: true });
      }
      detailPhoto.setAttribute("alt", `${info.name} 상세`);
    }
    detail.dataset.activeRegion = key;
    pointsHost.setAttribute("aria-label", `${info.name} 지점`);

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

  regionBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const regionKey = btn.dataset.region || "A";
      const customSrc = btn.dataset.detailImg;
      openDetail(regionKey, customSrc);
    });
  });
  btnBack.addEventListener("click", (e) => {
    e.preventDefault();
    closeDetail();
  });
})();
