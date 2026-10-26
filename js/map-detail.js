(function () {
  const mapWidget = document.querySelector(".map-widget");
  const overview = document.getElementById("map-overview");
  const detail = document.getElementById("map-detail");
  const detailPhoto = detail ? detail.querySelector(".map-photo-detail") : null;
  const pointsHost = document.getElementById("map-points");
  const regionBtns = document.querySelectorAll(".map-regions .region[data-region]");
  const btnBack = document.getElementById("map-back");
  if (!mapWidget || !overview || !detail || !pointsHost || !regionBtns.length || !btnBack) return;

  /** 구역별 상세 지도 이미지 파일 매핑 (다크/라이트 모드 대응) */
  const REGION_DETAIL_MAP = {
    A: { name: "헌법 재판소 일대", file: "map-detail-2.png" },
    B: { name: "광화문 광장 접점", file: "map-detail-4.png" },
    C: { name: "낙원동", file: "map-detail-3.png" },
    D: { name: "익선동", file: "map-detail-1.png" },
  };

  function getMapSrc(fileName) {
    const isLight = document.documentElement.getAttribute("data-mode") === "light";
    const prefix = isLight ? "light-" : "dark-";
    return `assets/maps/${prefix}${fileName}`;
  }

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
   * Figma 39:4868 — 헌법 재판소 일대 (Region A / Detail Map 2) Hitmap 원 중심 (프레임 860×950 기준 %)
   */
  const POINTS_A = [
    { id: "A-1", left: 30.0, top: 12.0, state: "normal", size: "lg", tipPos: "left", cctvPos: "left", people: 5100, density: 0.12 },
    { id: "A-2", left: 36.0, top: 19.0, state: "normal", size: "lg", tipPos: "left", cctvPos: "left", people: 6400, density: 0.16 },
    { id: "A-3", left: 48.0, top: 26.0, state: "warning", size: "lg", tipPos: "top", cctvPos: "right", people: 30500, density: 0.69 },
    { id: "A-4", left: 56.0, top: 26.0, state: "attention", size: "lg", tipPos: "right", cctvPos: "right", people: 12600, density: 0.32 },
    { id: "A-5", left: 54.0, top: 31.0, state: "normal", size: "lg", tipPos: "left", cctvPos: "left", people: 7200, density: 0.18 },
    { id: "A-6", left: 62.0, top: 34.0, state: "attention", size: "lg", tipPos: "right", cctvPos: "right", people: 14500, density: 0.36 },
    { id: "A-7", left: 54.4, top: 36.0, state: "caution", size: "lg", tipPos: "left", cctvPos: "left", people: 19500, density: 0.49 },
    { id: "A-8", left: 61.2, top: 40.0, state: "caution", size: "lg", tipPos: "right", cctvPos: "right", people: 20300, density: 0.51 },
    { id: "A-9", left: 54.0, top: 42.0, state: "warning", size: "lg", tipPos: "left", cctvPos: "left", people: 32800, density: 0.73 },
    { id: "A-10", left: 54.0, top: 48.0, state: "warning", size: "lg", tipPos: "left", cctvPos: "left", people: 31400, density: 0.71 },
    { id: "A-11", left: 54.0, top: 53.0, state: "caution", size: "lg", tipPos: "left", cctvPos: "left", people: 22800, density: 0.54 },
    { id: "A-12", left: 82.0, top: 54.0, state: "attention", size: "lg", tipPos: "right", cctvPos: "right", people: 13800, density: 0.34 },
    { id: "A-13", left: 66.0, top: 56.0, state: "danger", size: "lg", tipPos: "right", cctvPos: "right", people: 43800, density: 0.94 },
    { id: "A-14", left: 58.0, top: 61.0, state: "danger", size: "lg", tipPos: "left", cctvPos: "left", people: 45600, density: 0.98 },
    { id: "A-15", left: 60.0, top: 67.0, state: "warning", size: "lg", tipPos: "left", cctvPos: "left", people: 33600, density: 0.75 },
    { id: "A-16", left: 62.0, top: 72.2, state: "caution", size: "lg", tipPos: "left", cctvPos: "left", people: 21400, density: 0.61 },
    { id: "A-17", left: 68.0, top: 71.4, state: "attention", size: "lg", tipPos: "right", cctvPos: "right", people: 15200, density: 0.38 },
    { id: "A-18", left: 71.1, top: 77.1, state: "caution", size: "lg", tipPos: "right", cctvPos: "right", people: 24100, density: 0.58 },
    { id: "A-19", left: 68.0, top: 84.0, state: "warning", size: "lg", tipPos: "left", cctvPos: "left", people: 35200, density: 0.78 },
    { id: "A-20", left: 49.5, top: 91.3, state: "danger", size: "lg", tipPos: "left", cctvPos: "left", people: 48200, density: 1.04 },
    { id: "A-21", left: 25.3, top: 52.5, state: "attention", size: "lg", tipPos: "top", cctvPos: "right", people: 11200, density: 0.28 },
  ];

  /**
   * Figma 41:8295 — 광화문 광장 접점 (Region B / Detail Map 4) Hitmap 원 중심 (프레임 860×950 기준 %)
   * - 6개 지점, 전체 관심(attention) 상태, 상단 툴팁(tipPos: "top")
   */
  const POINTS_B = [
    { id: "B-1", left: 71.8, top: 25.0, state: "attention", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "B-2", left: 40.2, top: 39.0, state: "attention", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "B-3", left: 2, top: 56.3, state: "attention", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "B-4", left: 72.0, top: 56.0, state: "attention", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "B-5", left: 72.2, top: 66.0, state: "attention", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "B-6", left: 38.5, top: 86.4, state: "attention", size: "lg", tipPos: "top", cctvPos: "right" },
  ];

  /**
   * Figma 40:6922 — 낙원동 (Region C / Detail Map 3) Hitmap 원 중심 (프레임 860×950 기준 %)
   * - 10개 지점, 전체 정상(normal) 상태, 상단 툴팁(tipPos: "top")
   */
  const POINTS_C = [
    { id: "C-1", left: 64.0, top: 19.0, state: "normal", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "C-2", left: 74.0, top: 37.1, state: "normal", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "C-3", left: 30.0, top: 45.2, state: "normal", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "C-4", left: 68.3, top: 48.9, state: "normal", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "C-5", left: 40.9, top: 64.0, state: "normal", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "C-6", left: 73.1, top: 66.9, state: "normal", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "C-7", left: 57.1, top: 72.6, state: "normal", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "C-8", left: 10.0, top: 80.0, state: "normal", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "C-9", left: 30.0, top: 82.1, state: "normal", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "C-10", left: 63.5, top: 84.8, state: "normal", size: "lg", tipPos: "top", cctvPos: "right" },
  ];

  /**
   * Figma 25:1474 — 익선동 (Region D / Detail Map 1) Hitmap 원 중심 (프레임 860×950 기준 %)
   * - state  : "normal"(정상) | "attention"(관심) | "caution"(주의) | "warning"(경계) | "emergency"(위험)
   * - size   : "lg"(기본, 현재 크기) | "md"(중간) | "sm"(소형)
   * - tipPos : "top"(기본, 위) | "bottom"(아래) | "left"(왼쪽) | "right"(오른쪽)
   * - cctvPos: "right" (기본, 우측 상단) | "left" (좌측 상단)
   */
  const POINTS_D = [
    { id: "D-1", left: 48.5, top: 17.4, state: "attention", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "D-2", left: 24.4, top: 25.3, state: "normal", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "D-3", left: 49.7, top: 34.3, state: "attention", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "D-4", left: 14.5, top: 39.7, state: "caution", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "D-5", left: 40.0, top: 50.4, state: "warning", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "D-6", left: 66.7, top: 47.7, state: "attention", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "D-7", left: 14.1, top: 63.1, state: "warning", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "D-8", left: 30.7, top: 63.0, state: "warning", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "D-9", left: 76.1, top: 59.3, state: "normal", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "D-10", left: 84.3, top: 71.3, state: "caution", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "D-11", left: 20.4, top: 85.0, state: "warning", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "D-12", left: 46.9, top: 92.3, state: "warning", size: "lg", tipPos: "top", cctvPos: "right" },
    { id: "D-13", left: 76.2, top: 83.3, state: "warning", size: "lg", tipPos: "top", cctvPos: "right" },
  ];

  const REGION_POINTS = {
    A: POINTS_A,
    B: POINTS_B,
    C: POINTS_C,
    D: POINTS_D,
  };

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
    danger: {
      label: "위험",
      glow: "assets/map-detail/glow-emergency.svg",
      emoji: "assets/map-detail/emoji-emergency.png",
    },
    emergency: {
      label: "위험",
      glow: "assets/map-detail/glow-emergency.svg",
      emoji: "assets/map-detail/emoji-emergency.png",
    },
  };

  const VALID_TIP_POS = new Set(["top", "bottom", "left", "right"]);
  const VALID_SIZE = new Set(["sm", "md", "lg"]);
  const DEFAULT_POINT_METRICS = {
    people: 45600,
    density: 0.98,
  };

  function pointHtml(p) {
    const stateKey = STATE_META[p.state] ? p.state : "attention";
    const meta = STATE_META[stateKey];
    const size = VALID_SIZE.has(p.size) ? p.size : "lg";
    const tipPos = VALID_TIP_POS.has(p.tipPos) ? p.tipPos : "top";
    const cctvPos = p.cctvPos === "left" ? "left" : "right";
    const displayText = p.displayText || p.id;
    const peopleVal = p.people != null ? p.people : DEFAULT_POINT_METRICS.people;
    const densityVal = p.density != null ? p.density : DEFAULT_POINT_METRICS.density;
    const peopleStr = Number(peopleVal).toLocaleString("ko-KR");
    const densityStr = Number(densityVal).toFixed(2);
    return `
      <div class="map-point map-point--${size} is-${stateKey}" style="left:${p.left}%;top:${p.top}%;" data-id="${p.id}">
        <div class="mp-tip mp-tip--${tipPos} mp-tip--cctv-${cctvPos}">
          <div class="mp-tip-card">
            <div class="mp-emo">
              <span class="mp-emo-icon" role="img" aria-label="${meta.label}"></span>
              <span class="mp-badge"></span>
            </div>
            <div class="mp-stats">
              <p><span>인원</span><strong>${peopleStr}<small>명</small></strong></p>
              <p><span>밀집</span><strong>${densityStr}<small>명/m²</small></strong></p>
            </div>
            <button type="button" class="mp-cctv" title="CCTV" aria-label="${displayText} CCTV" aria-pressed="false">
              <img class="mp-cctv-cam" src="assets/map-detail/icon-cctv.svg" alt="" width="22" height="22">
              <img class="mp-cctv-pause" src="assets/map-detail/icon-cctv-pause.svg" alt="" width="22" height="22" hidden>
            </button>
          </div>
          <i class="mp-tip-arrow" aria-hidden="true"></i>
        </div>
        <div class="mp-core">
          <span class="mp-glow" aria-hidden="true"></span>
          <img class="mp-warn" src="assets/icons/icon-warn.svg" alt="" width="18" height="16">
          <strong class="mp-id">${displayText.replace("-", " - ")}</strong>
        </div>
      </div>`;
  }

  let currentRegion = "A";

  function renderPoints(regionKey) {
    if (regionKey) currentRegion = String(regionKey).toUpperCase();
    const list = REGION_POINTS[currentRegion] || REGION_POINTS.A;
    pointsHost.innerHTML = list.map(pointHtml).join("");
  }

  function openDetail(regionKey = "A", customSrc) {
    const key = String(regionKey || "A").toUpperCase();
    currentRegion = key;
    renderPoints(key);
    const info = REGION_DETAIL_MAP[key] || REGION_DETAIL_MAP.A;
    const targetSrc = customSrc || getMapSrc(info.file);

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

  function updateAllMapPhotos() {
    const overviewImg = overview?.querySelector(".map-photo");
    if (overviewImg) {
      const targetOverviewSrc = getMapSrc("map-overview.png");
      if (overviewImg.getAttribute("src") !== targetOverviewSrc) {
        overviewImg.setAttribute("src", targetOverviewSrc);
      }
    }
    if (detailPhoto && detail && !detail.hidden && currentRegion) {
      const info = REGION_DETAIL_MAP[currentRegion] || REGION_DETAIL_MAP.A;
      const targetDetailSrc = getMapSrc(info.file);
      if (detailPhoto.getAttribute("src") !== targetDetailSrc) {
        detailPhoto.setAttribute("src", targetDetailSrc);
      }
    }
    fitAllStages();
  }

  renderPoints();
  watchStage(overview);
  watchStage(detail);
  fitAllStages();
  window.addEventListener("resize", fitAllStages);
  window.addEventListener("themechange", updateAllMapPhotos);
  updateAllMapPhotos();

  regionBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const regionKey = btn.dataset.region || "A";
      openDetail(regionKey);
    });
  });
  btnBack.addEventListener("click", (e) => {
    e.preventDefault();
    closeDetail();
  });

  const sizeBar = document.getElementById("map-point-size-bar");
  if (sizeBar && pointsHost) {
    const sizeBtns = sizeBar.querySelectorAll(".point-size-btn");
    sizeBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const nextSize = btn.dataset.size || "sm";
        sizeBtns.forEach((b) => {
          const isActive = b === btn;
          b.classList.toggle("is-active", isActive);
          b.setAttribute("aria-checked", isActive ? "true" : "false");
        });
        pointsHost.setAttribute("data-point-size", nextSize);
      });
    });
  }

  window.openMapDetail = openDetail;
  window.closeMapDetail = closeDetail;

  // —— 지도 위젯 크게보기 (확대: full, 3/4, 1/2) 및 축소하기 (원래대로) 기능 ——
  const FS_STORAGE_KEY = "jongno-dashboard-map-fullscreen-state";
  let fsToastTimer = null;
  let currentMapRatio = "full";

  const RATIO_GRID_COLS = {
    "full": "1 / -1",
    "3/4": "7 / 25",
    "1/2": "13 / 25"
  };

  function saveFullscreenState(isFullscreen, ratio) {
    try {
      localStorage.setItem(
        FS_STORAGE_KEY,
        JSON.stringify({
          isFullscreen: Boolean(isFullscreen),
          ratio: ratio || currentMapRatio || "full"
        })
      );
    } catch (_) {}
  }

  function syncRatioInputs(ratio) {
    document.querySelectorAll(".map-ratio-selector").forEach((selector) => {
      selector.querySelectorAll(".map-ratio-option").forEach((opt) => {
        const input = opt.querySelector("input[type='radio']");
        if (!input) return;
        const isActive = input.value === ratio;
        input.checked = isActive;
        opt.classList.toggle("is-active", isActive);
        opt.setAttribute("aria-checked", isActive ? "true" : "false");
      });
    });
  }

  function applyMapGridRatio(ratio) {
    if (!mapWidget) return;
    if (!RATIO_GRID_COLS[ratio]) ratio = "full";
    currentMapRatio = ratio;
    mapWidget.setAttribute("data-ratio", ratio);

    if (mapWidget.classList.contains("is-fullscreen")) {
      const colRule = RATIO_GRID_COLS[ratio];
      mapWidget.style.setProperty("grid-column", colRule, "important");
      mapWidget.style.setProperty("grid-row", "1 / -1", "important");
      mapWidget.style.setProperty("position", "absolute", "important");
      mapWidget.style.setProperty("top", "0", "important");
      mapWidget.style.setProperty("left", "0", "important");
      mapWidget.style.setProperty("right", "0", "important");
      mapWidget.style.setProperty("bottom", "0", "important");
      mapWidget.style.setProperty("width", "100%", "important");
      mapWidget.style.setProperty("height", "100%", "important");
      mapWidget.style.setProperty("z-index", "100", "important");

      saveFullscreenState(true, currentMapRatio);
    }

    syncRatioInputs(ratio);

    requestAnimationFrame(() => {
      fitAllStages();
      window.dispatchEvent(new Event("resize"));
    });
  }

  function showFullscreenToast() {
    removeFullscreenToast();
    const toast = document.createElement("div");
    toast.className = "map-fullscreen-toast";
    toast.innerHTML = `<i class="bi bi-info-circle"></i><span>ESC 키 또는 [축소하기] 버튼을 누르면 원래 크기로 돌아갑니다.</span>`;
    mapWidget?.appendChild(toast);
    fsToastTimer = setTimeout(() => {
      removeFullscreenToast();
    }, 3200);
  }

  function removeFullscreenToast() {
    if (fsToastTimer) {
      clearTimeout(fsToastTimer);
      fsToastTimer = null;
    }
    const existing = mapWidget?.querySelector(".map-fullscreen-toast");
    if (existing) existing.remove();
  }

  let savedGridColumn = "";
  let savedGridRow = "";
  let savedInlineZIndex = "";

  function setMapFullscreen(enable, showToast = true) {
    if (!mapWidget) return;
    const isCurrentlyFs = mapWidget.classList.contains("is-fullscreen");
    if (enable === isCurrentlyFs) return;

    if (enable) {
      savedGridColumn = mapWidget.style.gridColumn || "";
      savedGridRow = mapWidget.style.gridRow || "";
      savedInlineZIndex = mapWidget.style.zIndex || "";

      mapWidget.classList.add("is-fullscreen");
      applyMapGridRatio(currentMapRatio);

      // 크게보기 진입 시 비율 선택 라디오 버튼 표시
      document.querySelectorAll(".map-ratio-selector").forEach((sel) => {
        sel.hidden = false;
      });

      saveFullscreenState(true, currentMapRatio);
    } else {
      mapWidget.classList.remove("is-fullscreen");
      mapWidget.removeAttribute("data-ratio");

      // 축소 시 비율 선택 라디오 버튼 숨김
      document.querySelectorAll(".map-ratio-selector").forEach((sel) => {
        sel.hidden = true;
      });

      // 새로고침 FOUC 방지용 fast 스타일 태그가 남아있다면 제거
      const fastFsStyle = document.getElementById("persisted-fs-fast");
      if (fastFsStyle) fastFsStyle.remove();

      if (savedGridColumn) {
        mapWidget.style.gridColumn = savedGridColumn;
      } else {
        mapWidget.style.removeProperty("grid-column");
      }
      if (savedGridRow) {
        mapWidget.style.gridRow = savedGridRow;
      } else {
        mapWidget.style.removeProperty("grid-row");
      }
      if (savedInlineZIndex) {
        mapWidget.style.zIndex = savedInlineZIndex;
      } else {
        mapWidget.style.removeProperty("z-index");
      }
      mapWidget.style.removeProperty("position");
      mapWidget.style.removeProperty("top");
      mapWidget.style.removeProperty("left");
      mapWidget.style.removeProperty("right");
      mapWidget.style.removeProperty("bottom");
      mapWidget.style.removeProperty("width");
      mapWidget.style.removeProperty("height");

      saveFullscreenState(false, currentMapRatio);
    }

    document.querySelectorAll(".map-view-toggle-btn").forEach((btn) => {
      const icon = btn.querySelector("i");
      const label = btn.querySelector(".map-view-toggle-label");
      if (enable) {
        if (icon) icon.className = "bi bi-fullscreen-exit";
        if (label) label.textContent = "축소하기";
        btn.setAttribute("title", "원래 크기로 축소 (ESC)");
        btn.setAttribute("aria-label", "지도 원래 크기로 축소");
      } else {
        if (icon) icon.className = "bi bi-fullscreen";
        if (label) label.textContent = "크게보기";
        btn.setAttribute("title", "지도 크게보기 (확대)");
        btn.setAttribute("aria-label", "지도 크게보기");
      }
    });

    if (enable) {
      if (showToast) showFullscreenToast();
    } else {
      removeFullscreenToast();
    }

    // 지도 캔버스 및 스테이지 contain 스케일 재계산
    requestAnimationFrame(() => {
      fitAllStages();
      window.dispatchEvent(new Event("resize"));
    });
  }

  function toggleMapFullscreen() {
    if (!mapWidget) return;
    const isFs = mapWidget.classList.contains("is-fullscreen");
    setMapFullscreen(!isFs);
  }

  // 버튼 직접 클릭 및 문서 이벤트 위임 이중 바인딩 (100% 클릭 보장)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".map-view-toggle-btn");
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      toggleMapFullscreen();
      return;
    }

    // 라디오 버튼 라벨 및 닷 직접 클릭 지원
    const opt = e.target.closest(".map-ratio-option");
    if (opt) {
      const radio = opt.querySelector("input[type='radio']");
      if (radio && (!radio.checked || currentMapRatio !== radio.value)) {
        radio.checked = true;
        applyMapGridRatio(radio.value);
      }
    }
  });

  // 라디오 인풋 change 이벤트 리스너
  document.addEventListener("change", (e) => {
    const input = e.target.closest(".map-ratio-selector input[type='radio']");
    if (!input) return;
    applyMapGridRatio(input.value);
  });

  // ESC 키 누르면 축소하기 (열려있는 모달이 없을 때 동작)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mapWidget?.classList.contains("is-fullscreen")) {
      const cctvModal = document.getElementById("cctv-modal");
      if (cctvModal && !cctvModal.hidden) return;
      const disasterModal = document.getElementById("disaster-modal");
      if (disasterModal && !disasterModal.hidden) return;
      setMapFullscreen(false);
    }
  });

  // 저장된 크게보기 상태 복원 (새로고침 시 유지)
  try {
    const rawFs = localStorage.getItem(FS_STORAGE_KEY);
    if (rawFs) {
      const fsData = JSON.parse(rawFs);
      if (fsData && fsData.isFullscreen) {
        if (fsData.ratio) currentMapRatio = fsData.ratio;
        setMapFullscreen(true, false);
      }
    }
  } catch (_) {}

  window.applyMapGridRatio = applyMapGridRatio;
  window.setMapFullscreen = setMapFullscreen;
  window.toggleMapFullscreen = toggleMapFullscreen;
})();
