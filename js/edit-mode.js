(function () {
  const STORAGE_KEY = "jongno-dashboard-removed-widgets";
  /** v19: 리사이즈 축 분리 및 인접 위젯 충돌 간섭 버그 완전 해결 */
  const SIZE_KEY = "jongno-dashboard-widget-sizes-v19";
  try {
    localStorage.removeItem("jongno-dashboard-widget-sizes-v14");
    localStorage.removeItem("jongno-dashboard-widget-sizes-v15");
    localStorage.removeItem("jongno-dashboard-widget-sizes-v16");
    localStorage.removeItem("jongno-dashboard-widget-sizes-v17");
    localStorage.removeItem("jongno-dashboard-widget-sizes-v18");
  } catch (_) {}
  const ORDER_KEY = "jongno-dashboard-widget-order";
  const MIN_COL_SPAN = 3;
  const MIN_ROW_SPAN = 3;
  const MIN_W = 160;
  const MIN_H = 120;
  const GRID_COLS = 24;
  const GRID_ROWS = 20;

  /** 보드 gap — 위젯↔위젯 최소 간격 */
  function collisionGap() {
    const board = getBoardEl();
    if (board) {
      const g = parseFloat(getComputedStyle(board).gap);
      if (Number.isFinite(g) && g > 0) return g;
    }
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--widget-gap-min")
      .trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 16;
  }

  /** 24×20 균등 칸 메트릭 (칸 크기 + gap) */
  function getGridMetrics() {
    const { width, height } = getBoardSize();
    const gap = collisionGap();
    const colW = Math.max(1, (width - gap * (GRID_COLS - 1)) / GRID_COLS);
    const rowH = Math.max(1, (height - gap * (GRID_ROWS - 1)) / GRID_ROWS);
    return { gap, colW, rowH, pitchX: colW + gap, pitchY: rowH + gap, width, height };
  }

  function spanSize(count, cell, gap) {
    const n = Math.max(1, count);
    return n * cell + (n - 1) * gap;
  }

  /** 위치·크기를 24×20 칸에 스냅 — 최소 3x3 규격 및 보드 경계 엄격 보장 (절대 찌그러지지 않음) */
  function snapBoxToGrid(left, top, w, h) {
    const { gap, colW, rowH, pitchX, pitchY, width, height } = getGridMetrics();
    let colSpan = Math.max(MIN_COL_SPAN, Math.round((w + gap) / pitchX));
    let rowSpan = Math.max(MIN_ROW_SPAN, Math.round((h + gap) / pitchY));
    colSpan = Math.min(colSpan, GRID_COLS);
    rowSpan = Math.min(rowSpan, GRID_ROWS);

    let c0 = Math.round(left / pitchX);
    let r0 = Math.round(top / pitchY);
    c0 = Math.max(0, Math.min(GRID_COLS - colSpan, c0));
    r0 = Math.max(0, Math.min(GRID_ROWS - rowSpan, r0));

    left = c0 * pitchX;
    top = r0 * pitchY;
    w = spanSize(colSpan, colW, gap);
    h = spanSize(rowSpan, rowH, gap);
    return {
      left: Math.round(left),
      top: Math.round(top),
      w: Math.round(w),
      h: Math.round(h),
      c0,
      r0,
      colSpan,
      rowSpan,
      colStart: c0 + 1,
      colEnd: c0 + colSpan + 1,
      rowStart: r0 + 1,
      rowEnd: r0 + rowSpan + 1,
    };
  }

  /**
   * 앞으로 추가할 위젯 카탈로그.
   * 보드에 없는 id만 모달에 노출됩니다.
   * 예: { id, name, category, icon }
   */
  const WIDGET_CATALOG = [
    { id: "zone-list", name: "구역 리스트", category: "모니터링", icon: "bi-list-ul" },
    { id: "alert-realtime", name: "실시간 위험구역 알림", category: "모니터링", icon: "bi-exclamation-triangle" },
    { id: "alert-disaster", name: "재난 안전 알림", category: "모니터링", icon: "bi-shield-exclamation" },
  ];

  /** 기본적으로 보드에 노출되지 않고 위젯 추가로만 배치되는 카탈로그 위젯 ID 목록 */
  const DEFAULT_HIDDEN_IDS = new Set(["alert-realtime", "alert-disaster"]);

  /** 위젯별 기본 24×20 그리드 좌표 및 규격 (공간 감지 및 자동 슬롯 계산용) */
  const DEFAULT_WIDGET_SPANS = {
    "kpi-current-stay": { colStart: 1, colEnd: 4, rowStart: 1, rowEnd: 4, colSpan: 3, rowSpan: 3 },
    "kpi-today-visit":  { colStart: 4, colEnd: 7, rowStart: 1, rowEnd: 4, colSpan: 3, rowSpan: 3 },
    "kpi-revisit":      { colStart: 7, colEnd: 10, rowStart: 1, rowEnd: 4, colSpan: 3, rowSpan: 3 },
    "kpi-avg-stay":     { colStart: 10, colEnd: 13, rowStart: 1, rowEnd: 4, colSpan: 3, rowSpan: 3 },
    "kpi-month-visit":  { colStart: 1, colEnd: 7, rowStart: 4, rowEnd: 7, colSpan: 6, rowSpan: 3 },
    "chart-compare":    { colStart: 7, colEnd: 13, rowStart: 4, rowEnd: 13, colSpan: 6, rowSpan: 9 },
    "chart-pie":        { colStart: 1, colEnd: 7, rowStart: 7, rowEnd: 14, colSpan: 6, rowSpan: 7 },
    "chart-stay":       { colStart: 1, colEnd: 7, rowStart: 14, rowEnd: 21, colSpan: 6, rowSpan: 7 },
    "chart-trend":      { colStart: 7, colEnd: 13, rowStart: 13, rowEnd: 21, colSpan: 6, rowSpan: 8 },
    "map-jongno":       { colStart: 13, colEnd: 25, rowStart: 1, rowEnd: 16, colSpan: 12, rowSpan: 15 },
    "zone-list":        { colStart: 13, colEnd: 25, rowStart: 16, rowEnd: 21, colSpan: 12, rowSpan: 5 },
    "alert-realtime":   { colStart: 19, colEnd: 25, rowStart: 2, rowEnd: 12, colSpan: 6, rowSpan: 10 },
    "alert-disaster":   { colStart: 13, colEnd: 19, rowStart: 2, rowEnd: 12, colSpan: 6, rowSpan: 10 },
  };

  const stage = document.getElementById("stage");
  const btnEdit = document.getElementById("btn-edit");
  const btnAdd = document.getElementById("btn-add-widget");
  const btnReset = document.getElementById("btn-reset-layout");
  const btnCancel = document.getElementById("btn-cancel-edit");
  const btnSave = document.getElementById("btn-save-edit");
  const toolbar = document.getElementById("edit-toolbar");
  const modal = document.getElementById("widget-modal");
  const catalogList = document.getElementById("widget-catalog-list");
  const searchInput = document.getElementById("widget-search");
  const settingsModal = document.getElementById("widget-settings-modal");
  const settingsTitleInput = document.getElementById("settings-title-input");
  const settingsTypeLabel = document.getElementById("settings-type-label");
  const settingsTypeDisplay = document.getElementById("settings-type-display");
  const settingsSaveBtn = document.getElementById("settings-save-btn");

  let editing = false;
  let pendingRemove = new Set();
  /** 편집 중 크기를 바꾼 위젯 — 저장 시 반드시 persist */
  let dirtySizeIds = new Set();
  let filterCategory = "all";
  let searchQuery = "";
  let settingsTarget = null;
  let sizeSnapshot = new Map();
  let visibilitySnapshot = new Map();
  let orderSnapshot = null;
  /** 페이지 최초 로드 시점의 제목 (초기화용) */
  const defaultMeta = new Map();
  /** 최초 DOM 순서 (초기화용) */
  let defaultOrder = null;

  const POS_PROPS = ["left", "top", "width", "height", "right", "bottom"];

  function widgets() {
    return Array.from(document.querySelectorAll(".board .widget[data-widget-id]"));
  }

  function loadRemoved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        return new Set(JSON.parse(raw));
      }
    } catch (_) {}
    return new Set(DEFAULT_HIDDEN_IDS);
  }

  function saveRemoved(ids) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  }

  function loadSizes() {
    try {
      const raw = localStorage.getItem(SIZE_KEY);
      const map = raw ? JSON.parse(raw) : {};
      Object.keys(map).forEach((id) => {
        const s = map[id];
        if (s && s.colStart && s.colEnd && s.rowStart && s.rowEnd) {
          if (s.colEnd - s.colStart < MIN_COL_SPAN) s.colEnd = s.colStart + MIN_COL_SPAN;
          if (s.rowEnd - s.rowStart < MIN_ROW_SPAN) s.rowEnd = s.rowStart + MIN_ROW_SPAN;
        }
      });
      return map;
    } catch {
      return {};
    }
  }

  function saveSizes(map) {
    localStorage.setItem(SIZE_KEY, JSON.stringify(map));
  }

  function getBoardSize() {
    const board = getBoardEl();
    if (!board) return { width: 1, height: 1 };
    const r = board.getBoundingClientRect();
    return { width: Math.max(1, r.width), height: Math.max(1, r.height) };
  }

  function getBoardRect() {
    const board = getBoardEl();
    return board ? board.getBoundingClientRect() : null;
  }

  function parsePx(value) {
    const m = String(value || "").match(/(\d+(?:\.\d+)?)px/);
    return m ? +m[1] : 0;
  }

  /** 위젯의 보드 기준 박스 (left/top/w/h px) */
  function readBoardBox(el) {
    const br = getBoardRect();
    const r = el.getBoundingClientRect();
    if (!br) {
      return { left: 0, top: 0, w: Math.round(r.width), h: Math.round(r.height) };
    }
    return {
      left: Math.round(r.left - br.left),
      top: Math.round(r.top - br.top),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  }

  function captureWidgetSize(el) {
    let colStart, colEnd, rowStart, rowEnd;
    const colMatch = el.style.gridColumn?.match(/(\d+)\s*\/\s*(\d+)/);
    const rowMatch = el.style.gridRow?.match(/(\d+)\s*\/\s*(\d+)/);
    if (colMatch && rowMatch) {
      colStart = parseInt(colMatch[1], 10);
      colEnd = parseInt(colMatch[2], 10);
      rowStart = parseInt(rowMatch[1], 10);
      rowEnd = parseInt(rowMatch[2], 10);
    } else {
      const cs = window.getComputedStyle(el);
      const cStart = parseInt(cs.gridColumnStart, 10);
      const cEnd = parseInt(cs.gridColumnEnd, 10);
      const rStart = parseInt(cs.gridRowStart, 10);
      const rEnd = parseInt(cs.gridRowEnd, 10);
      if (!isNaN(cStart) && !isNaN(cEnd) && !isNaN(rStart) && !isNaN(rEnd) && cStart > 0 && rStart > 0) {
        colStart = cStart;
        colEnd = cEnd;
        rowStart = rStart;
        rowEnd = rEnd;
      } else {
        const box = readBoardBox(el);
        const snapped = snapBoxToGrid(box.left, box.top, box.w, box.h);
        colStart = snapped.colStart;
        colEnd = snapped.colEnd;
        rowStart = snapped.rowStart;
        rowEnd = snapped.rowEnd;
      }
    }

    if (colEnd - colStart < MIN_COL_SPAN) colEnd = colStart + MIN_COL_SPAN;
    if (rowEnd - rowStart < MIN_ROW_SPAN) rowEnd = rowStart + MIN_ROW_SPAN;
    if (colEnd > GRID_COLS + 1) {
      colEnd = GRID_COLS + 1;
      colStart = Math.max(1, colEnd - MIN_COL_SPAN);
    }
    if (rowEnd > GRID_ROWS + 1) {
      rowEnd = GRID_ROWS + 1;
      rowStart = Math.max(1, rowEnd - MIN_ROW_SPAN);
    }
    return {
      basis: "grid",
      colStart,
      colEnd,
      rowStart,
      rowEnd,
    };
  }

  function resolveBoardBox(size, boardSize) {
    const board = boardSize || getBoardSize();
    const bw = Math.max(1, board.width);
    const bh = Math.max(1, board.height);
    let left = Math.round((size.leftRatio ?? 0) * bw);
    let top = Math.round((size.topRatio ?? 0) * bh);
    let w = Math.round((size.widthRatio ?? 0.2) * bw);
    let h = Math.round((size.heightRatio ?? 0.2) * bh);
    w = Math.max(10, Math.min(w, bw));
    h = Math.max(10, Math.min(h, bh));
    left = Math.max(0, Math.min(left, bw - w));
    top = Math.max(0, Math.min(top, bh - h));
    return { left, top, w, h, bw, bh };
  }

  /**
   * 보드 24×20 그리드 배치. 순수 CSS Grid 네이티브 동작으로 화면 크기 축소 시에도 겹치지 않고 축소됨.
   */
  function lockWidgetOnGrid(el, colStart, colEnd, rowStart, rowEnd) {
    if (!el) return;
    el.classList.add("has-custom-size");
    [
      ...POS_PROPS,
      "position",
      "margin",
      "min-width",
      "min-height",
      "max-width",
      "max-height",
      "flex",
      "z-index",
      "overflow",
    ].forEach((prop) => el.style.removeProperty(prop));

    el.style.gridColumn = `${colStart} / ${colEnd}`;
    el.style.gridRow = `${rowStart} / ${rowEnd}`;
  }

  function lockWidgetOnBoard(el, left, top, w, h) {
    const snap = snapBoxToGrid(left, top, w, h);
    lockWidgetOnGrid(el, snap.colStart, snap.colEnd, snap.rowStart, snap.rowEnd);
  }

  function applyWidgetSize(el, size, boardSize) {
    if (!el || !size || !hasStoredSize(size)) return;
    if (size.colStart != null && size.colEnd != null && size.rowStart != null && size.rowEnd != null) {
      lockWidgetOnGrid(el, size.colStart, size.colEnd, size.rowStart, size.rowEnd);
    } else {
      const board = boardSize || getBoardSize();
      const { left, top, w, h } = resolveBoardBox(size, board);
      const snap = snapBoxToGrid(left, top, w, h);
      lockWidgetOnGrid(el, snap.colStart, snap.colEnd, snap.rowStart, snap.rowEnd);
    }
  }

  function clearWidgetSize(el) {
    if (!el) return;
    [
      ...POS_PROPS,
      "position",
      "grid-column",
      "grid-row",
      "grid-area",
      "margin",
      "min-width",
      "min-height",
      "max-width",
      "max-height",
      "flex",
      "z-index",
      "overflow",
    ].forEach((prop) => el.style.removeProperty(prop));
    delete el.dataset.anchorX;
    delete el.dataset.anchorY;
    el.classList.remove("has-custom-size", "is-edit-pinned");
  }

  function applyPersistedRemoval() {
    const removed = loadRemoved();
    const sizes = loadSizes();
    widgets().forEach((el) => {
      const id = el.dataset.widgetId;
      const meta = defaultMeta.get(id);
      const isInitiallyHidden = meta ? meta.initialHidden : DEFAULT_HIDDEN_IDS.has(id);

      let shouldShow = false;
      if (isInitiallyHidden) {
        // 기본 비노출(카탈로그) 위젯은 사용자가 배치하여 sizes에 유효한 좌표가 있고, 삭제 목록에 없을 때 표시
        shouldShow = !removed.has(id) && Boolean(sizes[id] && hasStoredSize(sizes[id]));
      } else {
        // 기본 노출 위젯은 삭제 목록(removed)에 없으면 표시
        shouldShow = !removed.has(id);
      }

      if (shouldShow) {
        el.hidden = false;
        el.classList.remove("is-removed", "is-pending-remove");
      } else {
        el.hidden = true;
        el.classList.add("is-removed");
      }
    });
    refreshEmptyRows();
  }

  function hasStoredSize(size) {
    return !!(
      size &&
      ((size.colStart != null && size.colEnd != null && size.rowStart != null && size.rowEnd != null) ||
       (size.basis === "board" && size.leftRatio != null && size.topRatio != null))
    );
  }

  function applyPersistedSizes() {
    const sizes = loadSizes();
    const board = getBoardSize();
    Object.entries(sizes).forEach(([id, size]) => {
      if (!hasStoredSize(size)) return;
      const el = document.querySelector(`.widget[data-widget-id="${id}"]`);
      if (el) applyWidgetSize(el, size, board);
    });
    window.dispatchEvent(new Event("resize"));
  }

  /** 사이드바/윈도우로 보드 크기가 바뀔 때 커스텀 위젯·차트 동기화 */
  function bindBoardReflow() {
    const board = getBoardEl();
    const main = document.querySelector(".app-main");
    const target = main || board;
    if (!target || target.dataset.reflowBound === "1") return;
    target.dataset.reflowBound = "1";

    let lastW = 0;
    let lastH = 0;
    let raf = 0;

    const reflow = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const { width, height } = getBoardSize();
        const changed = Math.abs(width - lastW) > 0.5 || Math.abs(height - lastH) > 0.5;
        lastW = width;
        lastH = height;
        if (changed && !editing) applyPersistedSizes();
        else window.dispatchEvent(new Event("resize"));
      });
    };

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(reflow);
      ro.observe(target);
      if (board && board !== target) ro.observe(board);
    }
  }

  function snapshotSizes() {
    sizeSnapshot.clear();
    const sizes = loadSizes();
    widgets().forEach((el) => {
      const id = el.dataset.widgetId;
      sizeSnapshot.set(id, {
        stored: sizes[id] ? { ...sizes[id] } : null,
        custom: el.classList.contains("has-custom-size"),
      });
    });
  }

  function restoreSizeSnapshot() {
    dirtySizeIds.clear();
    sizeSnapshot.forEach((snap, id) => {
      const el = document.querySelector(`.widget[data-widget-id="${id}"]`);
      if (!el) return;
      clearWidgetSize(el);
      if (snap.stored && hasStoredSize(snap.stored)) {
        applyWidgetSize(el, snap.stored, getBoardSize());
      }
    });
    window.dispatchEvent(new Event("resize"));
  }

  function getBoardEl() {
    return document.querySelector(".board");
  }

  /** relative left/top 기준점(플로우 위치) — 화면 좌표 */
  function getWidgetBase(widget, left, top) {
    const rect = widget.getBoundingClientRect();
    return {
      left: rect.left - left,
      top: rect.top - top,
      width: rect.width,
      height: rect.height,
    };
  }

  /** @deprecated 칸 스냅은 snapBoxToGrid 사용 */
  function snapValue(value) {
    const { pitchX } = getGridMetrics();
    return Math.round(value / pitchX) * pitchX;
  }

  /**
   * 위젯이 .board 밖으로 나가지 않도록 left/top/w/h 보정
   * @param {string} mode 'drag' | resize dir ('e','w','n','s','ne',...)
   */
  function clampToBoard(baseLeft, baseTop, left, top, w, h, mode) {
    const board = getBoardEl()?.getBoundingClientRect();
    if (!board) {
      return {
        left: Math.round(left),
        top: Math.round(top),
        w: Math.round(Math.max(MIN_W, w)),
        h: Math.round(Math.max(MIN_H, h)),
      };
    }

    w = Math.max(MIN_W, Math.min(w, board.width));
    h = Math.max(MIN_H, Math.min(h, board.height));

    let vl = baseLeft + left;
    let vt = baseTop + top;

    if (mode === "drag") {
      if (vl < board.left) left += board.left - vl;
      if (vt < board.top) top += board.top - vt;
      vl = baseLeft + left;
      vt = baseTop + top;
      if (vl + w > board.right) left -= vl + w - board.right;
      if (vt + h > board.bottom) top -= vt + h - board.bottom;
    } else {
      if (mode.includes("e") && vl + w > board.right) {
        w = board.right - vl;
      }
      if (mode.includes("w") && vl < board.left) {
        const right = vl + w;
        left += board.left - vl;
        vl = board.left;
        w = right - vl;
      }
      if (mode.includes("s") && vt + h > board.bottom) {
        h = board.bottom - vt;
      }
      if (mode.includes("n") && vt < board.top) {
        const bottom = vt + h;
        top += board.top - vt;
        vt = board.top;
        h = bottom - vt;
      }

      // 드래그 없이 밀려 나간 경우 보정
      vl = baseLeft + left;
      vt = baseTop + top;
      if (vl < board.left) left += board.left - vl;
      if (vt < board.top) top += board.top - vt;
      vl = baseLeft + left;
      vt = baseTop + top;
      if (vl + w > board.right) w = Math.max(MIN_W, board.right - vl);
      if (vt + h > board.bottom) h = Math.max(MIN_H, board.bottom - vt);
    }

    return {
      left: Math.round(left),
      top: Math.round(top),
      w: Math.round(Math.max(MIN_W, w)),
      h: Math.round(Math.max(MIN_H, h)),
    };
  }

  function applyGeometry(widget, left, top, w, h) {
    widget.style.left = `${left}px`;
    widget.style.top = `${top}px`;
    if (w != null) widget.style.width = `${w}px`;
    if (h != null) widget.style.height = `${h}px`;
  }

  function isWidgetVisible(el) {
    return el && !el.hidden && !el.classList.contains("is-removed") && !pendingRemove.has(el.dataset.widgetId);
  }

  /** 다른 위젯 화면 영역 및 그리드 좌표 (리사이즈/드래그 충돌용) */
  function getObstacles(active) {
    return widgets()
      .filter((w) => w !== active && isWidgetVisible(w))
      .map((w) => {
        const grid = captureWidgetSize(w);
        const r = w.getBoundingClientRect();
        return {
          el: w,
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
          colStart: grid.colStart,
          colEnd: grid.colEnd,
          rowStart: grid.rowStart,
          rowEnd: grid.rowEnd,
        };
      });
  }

  const COLLISION_EPS = 3; // 서브픽셀 렌더링 오차 허용치(px)

  function rectsHit(vl, vt, vr, vb, o, gap) {
    return (
      vl < o.right + gap - COLLISION_EPS &&
      vr > o.left - gap + COLLISION_EPS &&
      vt < o.bottom + gap - COLLISION_EPS &&
      vb > o.top - gap + COLLISION_EPS
    );
  }

  function clearCollisionVisuals() {
    document.querySelectorAll(".widget.is-resize-blocked, .widget.is-collision-target").forEach((el) => {
      el.classList.remove("is-resize-blocked", "is-collision-target");
    });
  }

  function setCollisionVisuals(widget, hitting) {
    clearCollisionVisuals();
    if (!hitting.length) return;
    widget.classList.add("is-resize-blocked");
    hitting.forEach((o) => o.el.classList.add("is-collision-target"));
  }

  /**
   * 다른 위젯 영역으로는 못 넘어가게 클램프.
   * - 최소 3x3 규격(MIN_W, MIN_H) 미만으로 찌그러지지 않도록 방어
   */
  function clampToObstacles(baseLeft, baseTop, left, top, w, h, dir, obstacles, gap = collisionGap()) {
    let vl = baseLeft + left;
    let vt = baseTop + top;
    let vr = vl + w;
    let vb = vt + h;
    let blocked = false;
    const hitting = [];

    // 1) 드래그(drag) 이동 시: 다른 위젯과 최소 gap 유지 (맞바꾸기 대상 아닐 때만 밀어냄)
    if (dir === "drag") {
      for (const o of obstacles) {
        const overlapsX = vl < o.right + gap - COLLISION_EPS && vr > o.left - gap + COLLISION_EPS;
        const overlapsY = vt < o.bottom + gap - COLLISION_EPS && vb > o.top - gap + COLLISION_EPS;
        if (!overlapsX || !overlapsY) continue;

        const pushL = vr - (o.left - gap);
        const pushR = o.right + gap - vl;
        const pushT = vb - (o.top - gap);
        const pushB = o.bottom + gap - vt;
        const minPush = Math.min(pushL, pushR, pushT, pushB);

        if (minPush === pushL) left -= pushL;
        else if (minPush === pushR) left += pushR;
        else if (minPush === pushT) top -= pushT;
        else top += pushB;

        vl = baseLeft + left;
        vt = baseTop + top;
        vr = vl + w;
        vb = vt + h;
        blocked = true;
        hitting.push(o);
      }

      return {
        left: Math.round(left),
        top: Math.round(top),
        w: Math.round(Math.max(MIN_W, w)),
        h: Math.round(Math.max(MIN_H, h)),
        blocked,
        hitting,
      };
    }

    return {
      left: Math.round(left),
      top: Math.round(top),
      w: Math.round(Math.max(MIN_W, w)),
      h: Math.round(Math.max(MIN_H, h)),
      blocked: false,
      hitting: [],
    };
  }

  function startResize(e, widget, dir) {
    e.preventDefault();
    e.stopPropagation();
    if (e.button != null && e.button !== 0) return;

    try {
      e.target?.setPointerCapture?.(e.pointerId);
    } catch (_) {}

    const board = getBoardSize();
    const br = getBoardRect();
    if (!br) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const start = readBoardBox(widget);
    const startSnap = snapBoxToGrid(start.left, start.top, start.w, start.h);
    const obstacles = getObstacles(widget);
    const gap = collisionGap();
    const { pitchX, pitchY, colW, rowH } = getGridMetrics();

    widget.classList.add("is-resizing", "has-custom-size");
    if (dir === "drag") widget.classList.add("is-dragging");

    let activeSwapTarget = null;
    let lastValidSnap = snapBoxToGrid(start.left, start.top, start.w, start.h);
    let resizeRaf = null;

    const applyLive = (left, top, w, h) => {
      widget.style.position = "absolute";
      widget.style.zIndex = "1000";
      widget.style.gridColumn = "1 / -1";
      widget.style.gridRow = "1 / -1";
      widget.style.left = `${left}px`;
      widget.style.top = `${top}px`;
      widget.style.width = `${w}px`;
      widget.style.height = `${h}px`;
      widget.style.margin = "0";
    };
    applyLive(start.left, start.top, start.w, start.h);

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let left = start.left;
      let top = start.top;
      let w = start.w;
      let h = start.h;

      if (dir === "drag") {
        left = start.left + dx;
        top = start.top + dy;
        ({ left, top, w, h } = snapBoxToGrid(left, top, start.w, start.h));

        // 보드 밖으로 못 나감
        let clamped = clampToBoard(br.left, br.top, left, top, w, h, dir);
        left = clamped.left;
        top = clamped.top;

        // 맞바꾸기(Swap) 대상 탐색
        let bestScore = 0;
        let bestTarget = null;
        const mx = ev.clientX;
        const my = ev.clientY;

        const curVl = br.left + left;
        const curVt = br.top + top;
        const curVr = curVl + w;
        const curVb = curVt + h;

        for (const o of obstacles) {
          const pointerInside = mx >= o.left && mx <= o.right && my >= o.top && my <= o.bottom;
          const overlapW = Math.max(0, Math.min(curVr, o.right) - Math.max(curVl, o.left));
          const overlapH = Math.max(0, Math.min(curVb, o.bottom) - Math.max(curVt, o.top));
          const overlapArea = overlapW * overlapH;
          const oArea = Math.max(1, (o.right - o.left) * (o.bottom - o.top));
          const myArea = Math.max(1, w * h);
          const overlapRatio = overlapArea / Math.min(oArea, myArea);

          let score = 0;
          if (pointerInside) {
            score = 1000 + overlapRatio * 100;
          } else if (overlapRatio >= 0.35) {
            score = overlapRatio * 100;
          }

          if (score > bestScore) {
            bestScore = score;
            bestTarget = o.el;
          }
        }

        if (bestScore > 0 && bestTarget) {
          activeSwapTarget = bestTarget;
          clearCollisionVisuals();
          widget.classList.add("is-swap-ready");
          obstacles.forEach((o) => {
            if (o.el === activeSwapTarget) {
              o.el.classList.add("is-swap-target");
            } else {
              o.el.classList.remove("is-swap-target");
            }
          });
        } else {
          activeSwapTarget = null;
          widget.classList.remove("is-swap-ready");
          obstacles.forEach((o) => o.el.classList.remove("is-swap-target"));

          // 다른 위젯과 최소 gap 유지 (맞바꾸기 대상 아닐 때만 밀어냄)
          let hit = clampToObstacles(br.left, br.top, left, top, w, h, dir, obstacles, gap);
          left = hit.left;
          top = hit.top;
          w = hit.w;
          h = hit.h;
          setCollisionVisuals(widget, hit.hitting);
        }

        lastValidSnap = snapBoxToGrid(left, top, start.w, start.h);
      } else {
        // 리사이즈 모드: 마우스 드래그 변위로부터 그리드 슬롯 직접 산출 (인접 위젯 간섭 및 찌그러짐 원천 차단)
        let rawLeft = start.left;
        let rawTop = start.top;
        let rawW = start.w;
        let rawH = start.h;

        const minWpx = spanSize(MIN_COL_SPAN, colW, gap);
        const minHpx = spanSize(MIN_ROW_SPAN, rowH, gap);

        if (dir.includes("e")) rawW = Math.max(minWpx, start.w + dx);
        if (dir.includes("w")) {
          const maxLeft = start.left + start.w - minWpx;
          rawLeft = Math.min(maxLeft, start.left + dx);
          rawW = start.left + start.w - rawLeft;
        }
        if (dir.includes("s")) rawH = Math.max(minHpx, start.h + dy);
        if (dir.includes("n")) {
          const maxTop = start.top + start.h - minHpx;
          rawTop = Math.min(maxTop, start.top + dy);
          rawH = start.top + start.h - rawTop;
        }

        // 목표 그리드 슬롯 계산
        let colStart = Math.max(1, Math.min(GRID_COLS, Math.round(rawLeft / pitchX) + 1));
        let colEnd = Math.max(colStart + MIN_COL_SPAN, Math.min(GRID_COLS + 1, Math.round((rawLeft + rawW + gap) / pitchX) + 1));
        let rowStart = Math.max(1, Math.min(GRID_ROWS, Math.round(rawTop / pitchY) + 1));
        let rowEnd = Math.max(rowStart + MIN_ROW_SPAN, Math.min(GRID_ROWS + 1, Math.round((rawTop + rawH + gap) / pitchY) + 1));

        // 조절하지 않는 축의 모서리는 시작 위치에 고정
        if (!dir.includes("w")) colStart = startSnap.colStart;
        if (!dir.includes("e")) colEnd = startSnap.colEnd;
        if (!dir.includes("n")) rowStart = startSnap.rowStart;
        if (!dir.includes("s")) rowEnd = startSnap.rowEnd;

        // 확장 방향에 위치한 장애물과의 충돌 검사 및 클램프 (인접한 다른 축 위젯과의 간섭 완전 차단)
        const gridHitting = [];
        for (const o of obstacles) {
          const rowsOverlap = (rowStart < o.rowEnd && rowEnd > o.rowStart);
          if (rowsOverlap) {
            // 서쪽 확장 시: 원래 내 왼쪽(또는 그 이전)에 위치하던 장애물만 서쪽 확장을 가로막음
            if (dir.includes("w") && o.colEnd <= startSnap.colStart) {
              if (colStart < o.colEnd) {
                colStart = o.colEnd;
                gridHitting.push(o);
              }
            }
            // 동쪽 확장 시: 원래 내 오른쪽(또는 그 이후)에 위치하던 장애물만 동쪽 확장을 가로막음
            if (dir.includes("e") && o.colStart >= startSnap.colEnd) {
              if (colEnd > o.colStart) {
                colEnd = o.colStart;
                gridHitting.push(o);
              }
            }
          }

          const colsOverlap = (colStart < o.colEnd && colEnd > o.colStart);
          if (colsOverlap) {
            // 북쪽 확장 시: 원래 내 위쪽(또는 그 이전)에 위치하던 장애물만 북쪽 확장을 가로막음
            if (dir.includes("n") && o.rowEnd <= startSnap.rowStart) {
              if (rowStart < o.rowEnd) {
                rowStart = o.rowEnd;
                gridHitting.push(o);
              }
            }
            // 남쪽 확장 시: 원래 내 아래쪽(또는 그 이후)에 위치하던 장애물만 남쪽 확장을 가로막음
            if (dir.includes("s") && o.rowStart >= startSnap.rowEnd) {
              if (rowEnd > o.rowStart) {
                rowEnd = o.rowStart;
                gridHitting.push(o);
              }
            }
          }
        }

        // 최소 스팬 규격 보장
        if (colEnd - colStart < MIN_COL_SPAN) {
          if (dir.includes("w")) colStart = colEnd - MIN_COL_SPAN;
          else colEnd = colStart + MIN_COL_SPAN;
        }
        if (rowEnd - rowStart < MIN_ROW_SPAN) {
          if (dir.includes("n")) rowStart = rowEnd - MIN_ROW_SPAN;
          else rowEnd = rowStart + MIN_ROW_SPAN;
        }

        // 보드 경계 보장 (1 ~ 25, 1 ~ 21)
        colStart = Math.max(1, Math.min(GRID_COLS + 1 - MIN_COL_SPAN, colStart));
        colEnd = Math.max(colStart + MIN_COL_SPAN, Math.min(GRID_COLS + 1, colEnd));
        rowStart = Math.max(1, Math.min(GRID_ROWS + 1 - MIN_ROW_SPAN, rowStart));
        rowEnd = Math.max(rowStart + MIN_ROW_SPAN, Math.min(GRID_ROWS + 1, rowEnd));

        const c0 = colStart - 1;
        const r0 = rowStart - 1;
        const colSpan = colEnd - colStart;
        const rowSpan = rowEnd - rowStart;

        left = c0 * pitchX;
        top = r0 * pitchY;
        w = spanSize(colSpan, colW, gap);
        h = spanSize(rowSpan, rowH, gap);

        lastValidSnap = {
          left: Math.round(left),
          top: Math.round(top),
          w: Math.round(w),
          h: Math.round(h),
          c0,
          r0,
          colSpan,
          rowSpan,
          colStart,
          colEnd,
          rowStart,
          rowEnd,
        };

        setCollisionVisuals(widget, gridHitting);
      }

      applyLive(left, top, w, h);
      if (!resizeRaf) {
        resizeRaf = requestAnimationFrame(() => {
          resizeRaf = null;
          window.dispatchEvent(new Event("resize"));
        });
      }
    };

    const onUp = () => {
      if (resizeRaf) {
        cancelAnimationFrame(resizeRaf);
        resizeRaf = null;
      }
      try {
        e.target?.releasePointerCapture?.(e.pointerId);
      } catch (_) {}

      widget.classList.remove("is-resizing", "is-dragging", "is-swap-ready");
      clearCollisionVisuals();
      document.querySelectorAll(".widget.is-swap-target").forEach((el) => {
        el.classList.remove("is-swap-target");
      });

      if (dir === "drag" && activeSwapTarget) {
        const targetEl = activeSwapTarget;
        activeSwapTarget = null;

        // 드래그 중이던 위젯 A의 원래 위치/크기 & 맞바꿀 대상 위젯 B의 위치/크기
        const targetBox = readBoardBox(targetEl);
        const snappedTarget = snapBoxToGrid(targetBox.left, targetBox.top, targetBox.w, targetBox.h);
        const snappedStart = snapBoxToGrid(start.left, start.top, start.w, start.h);

        // A를 B 그리드 자리로 배치
        lockWidgetOnGrid(widget, snappedTarget.colStart, snappedTarget.colEnd, snappedTarget.rowStart, snappedTarget.rowEnd);
        // B를 A 원래 그리드 자리로 배치
        lockWidgetOnGrid(targetEl, snappedStart.colStart, snappedStart.colEnd, snappedStart.rowStart, snappedStart.rowEnd);

        if (widget.dataset.widgetId) dirtySizeIds.add(widget.dataset.widgetId);
        if (targetEl.dataset.widgetId) dirtySizeIds.add(targetEl.dataset.widgetId);

        widget.classList.add("is-swapped");
        targetEl.classList.add("is-swapped");
        setTimeout(() => {
          widget.classList.remove("is-swapped");
          targetEl.classList.remove("is-swapped");
        }, 600);
      } else {
        // 드래그/리사이즈 완료: lastValidSnap을 적용하여 찌그러짐 원천 차단
        lockWidgetOnGrid(widget, lastValidSnap.colStart, lastValidSnap.colEnd, lastValidSnap.rowStart, lastValidSnap.rowEnd);
        if (widget.dataset.widgetId) dirtySizeIds.add(widget.dataset.widgetId);
      }

      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      window.dispatchEvent(new Event("resize"));
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  function captureOrderMap() {
    const board = getBoardEl();
    if (!board) return {};
    const ids = [...board.children]
      .filter((c) => c.classList?.contains("widget") && c.dataset.widgetId)
      .map((c) => c.dataset.widgetId);
    return ids.length ? { board: ids } : {};
  }

  function resolveOrderParent(key) {
    if (key === "board") return getBoardEl();
    return null;
  }

  function saveOrder() {
    localStorage.setItem(ORDER_KEY, JSON.stringify(captureOrderMap()));
  }

  function loadOrder() {
    try {
      const raw = localStorage.getItem(ORDER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function applyOrderMap(map) {
    if (!map) return;
    Object.entries(map).forEach(([key, ids]) => {
      const parent = resolveOrderParent(key);
      if (!parent || !Array.isArray(ids)) return;
      ids.forEach((id) => {
        const el = document.querySelector(`.widget[data-widget-id="${id}"]`);
        if (el) parent.appendChild(el);
      });
    });
  }

  function applyPersistedOrder() {
    applyOrderMap(loadOrder());
  }

  function bindChromeEvents(widget, chrome) {
    if (chrome.dataset.bound === "1") return;
    chrome.dataset.bound = "1";
    chrome.querySelector(".widget-remove")?.addEventListener("click", (e) => {
      e.stopPropagation();
      removeWidgetNow(widget);
    });
    chrome.querySelector(".widget-gear")?.addEventListener("click", (e) => {
      e.stopPropagation();
      openSettings(widget);
    });
    chrome.querySelector(".widget-drag")?.addEventListener("pointerdown", (e) => {
      startResize(e, widget, "drag");
    });
    chrome.querySelectorAll(".resize-handle, .resize-edge").forEach((handle) => {
      handle.addEventListener("pointerdown", (e) => {
        startResize(e, widget, handle.dataset.dir);
      });
    });
  }

  const CHROME_HTML = `
    <div class="widget-edit-bar">
      <button type="button" class="widget-drag" title="이동" aria-label="위젯 이동">
        <i class="bi bi-arrows-move"></i>
      </button>
      <div class="widget-edit-right">
        <button type="button" class="widget-gear" title="설정" aria-label="위젯 설정">
          <i class="bi bi-gear"></i>
        </button>
        <button type="button" class="widget-remove" title="삭제" aria-label="위젯 삭제">
          <i class="bi bi-trash3"></i>
        </button>
      </div>
    </div>
    <button type="button" class="resize-handle nw" data-dir="nw" title="크기 조절" aria-label="왼쪽 위 크기 조절">
      <i class="bi bi-arrow-up-left"></i>
    </button>
    <button type="button" class="resize-handle ne" data-dir="ne" title="크기 조절" aria-label="오른쪽 위 크기 조절">
      <i class="bi bi-arrow-up-right"></i>
    </button>
    <button type="button" class="resize-handle sw" data-dir="sw" title="크기 조절" aria-label="왼쪽 아래 크기 조절">
      <i class="bi bi-arrow-down-left"></i>
    </button>
    <button type="button" class="resize-handle se" data-dir="se" title="크기 조절" aria-label="오른쪽 아래 크기 조절">
      <i class="bi bi-arrow-down-right"></i>
    </button>
    <button type="button" class="resize-edge n" data-dir="n" title="높이 조절" aria-label="위쪽 높이 조절"></button>
    <button type="button" class="resize-edge e" data-dir="e" title="너비 조절" aria-label="오른쪽 너비 조절"></button>
    <button type="button" class="resize-edge s" data-dir="s" title="높이 조절" aria-label="아래쪽 높이 조절"></button>
    <button type="button" class="resize-edge w" data-dir="w" title="너비 조절" aria-label="왼쪽 너비 조절"></button>
  `;

  function ensureChrome(widget) {
    let chrome = widget.querySelector(".widget-chrome");
    if (!chrome) {
      chrome = document.createElement("div");
      chrome.className = "widget-chrome";
      widget.appendChild(chrome);
    }
    // 최신 마크업 강제 (이동·삭제·엣지 핸들)
    const hasDrag = !!chrome.querySelector(".widget-drag");
    const removeInBar = !!chrome.querySelector(".widget-edit-right .widget-remove");
    const hasEdges = !!chrome.querySelector(".resize-edge");
    if (!chrome.querySelector(".widget-edit-bar") || !hasDrag || !removeInBar || !hasEdges) {
      chrome.innerHTML = CHROME_HTML;
      chrome.dataset.bound = "0";
    }
    bindChromeEvents(widget, chrome);
  }

  function getWidgetTitleEl(widget) {
    return widget.querySelector(".kpi-head h2, .chart-head h2, .chart-head h3, :scope > h2");
  }

  function getWidgetTitleText(widget) {
    const el = getWidgetTitleEl(widget);
    if (el) {
      const clone = el.cloneNode(true);
      clone.querySelectorAll("em").forEach((em) => em.remove());
      return clone.textContent.trim();
    }
    return widget.dataset.widgetName || "";
  }

  function openSettings(widget) {
    settingsTarget = widget;
    if (!widget.dataset.widgetType) {
      widget.dataset.widgetType = widget.dataset.widgetName || getWidgetTitleText(widget);
    }
    settingsTitleInput.value = getWidgetTitleText(widget);
    settingsTypeLabel.textContent = widget.dataset.widgetType;
    const icon = settingsTypeDisplay.querySelector("i");
    icon.className = `bi ${categoryIcon(widget.dataset.widgetCategory)}`;
    settingsModal.hidden = false;
    settingsModal.setAttribute("aria-hidden", "false");
    settingsTitleInput.focus();
    settingsTitleInput.select();
  }

  function closeSettings() {
    settingsModal.hidden = true;
    settingsModal.setAttribute("aria-hidden", "true");
    settingsTarget = null;
  }

  function saveSettings() {
    if (!settingsTarget) return;
    const next = settingsTitleInput.value.trim();
    if (!next) {
      settingsTitleInput.focus();
      return;
    }
    settingsTarget.dataset.widgetName = next;
    const titleEl = getWidgetTitleEl(settingsTarget);
    if (titleEl) {
      const em = titleEl.querySelector("em");
      const emHtml = em ? ` ${em.outerHTML}` : "";
      titleEl.innerHTML = next + emHtml;
    }
    closeSettings();
  }

  function refreshEmptyRows() {
    /* 섹션/row 없음 — no-op */
  }

  /** 편집 중 삭제: 바로 숨겨서 자리 비움 (저장 시 확정, 취소 시 복구) */
  function removeWidgetNow(widget) {
    const id = widget.dataset.widgetId;
    if (!id) return;
    pendingRemove.add(id);
    widget.hidden = true;
    widget.classList.add("is-pending-remove", "is-removed");
    refreshEmptyRows();
    window.dispatchEvent(new Event("resize"));
  }

  function enterEdit() {
    if (typeof window.setMapFullscreen === "function") {
      window.setMapFullscreen(false);
    }
    editing = true;
    pendingRemove = new Set();
    dirtySizeIds = new Set();
    visibilitySnapshot.clear();
    widgets().forEach((w) => {
      visibilitySnapshot.set(w.dataset.widgetId, !w.hidden);
    });
    stage.classList.add("is-editing");
    toolbar.hidden = false;
    // 툴바 표시 후 보드 크기 확정 → 보기와 같은 잠금 적용
    applyPersistedSizes();
    snapshotSizes();
    orderSnapshot = captureOrderMap();
    widgets().forEach((w) => {
      if (w.hidden) return;
      w.querySelector(".widget-chrome")?.remove();
      ensureChrome(w);
      w.classList.remove("is-pending-remove");
    });
    window.dispatchEvent(new Event("resize"));
  }

  function exitEdit() {
    editing = false;
    stage.classList.remove("is-editing");
    toolbar.hidden = true;
    closeModal();
    closeSettings();
    widgets().forEach((w) =>
      w.classList.remove(
        "is-resizing",
        "is-dragging",
        "is-swap-target",
        "is-swap-ready",
        "is-swapped",
        "is-resize-blocked",
        "is-collision-target"
      )
    );
    pendingRemove = new Set();
  }

  function captureDefaultMeta() {
    defaultMeta.clear();
    widgets().forEach((el) => {
      const titleEl = getWidgetTitleEl(el);
      const isInitiallyHidden =
        el.hasAttribute("hidden") ||
        el.classList.contains("is-removed") ||
        el.dataset.widgetId === "alert-realtime" ||
        el.dataset.widgetId === "alert-disaster";
      defaultMeta.set(el.dataset.widgetId, {
        name: el.dataset.widgetName || "",
        titleHtml: titleEl ? titleEl.innerHTML : null,
        initialHidden: isInitiallyHidden,
      });
    });
  }

  /** 처음 HTML 배치·크기·제목으로 복구 (저장값도 비움) */
  function resetLayout() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SIZE_KEY);
    localStorage.removeItem(ORDER_KEY);
    localStorage.removeItem("jongno-dashboard-map-fullscreen-state");
    pendingRemove = new Set();
    dirtySizeIds.clear();
    if (defaultOrder) applyOrderMap(defaultOrder);

    widgets().forEach((el) => {
      clearWidgetSize(el);
      const meta = defaultMeta.get(el.dataset.widgetId);
      const shouldHide = meta
        ? meta.initialHidden
        : DEFAULT_HIDDEN_IDS.has(el.dataset.widgetId);

      if (shouldHide) {
        el.hidden = true;
        el.classList.add("is-removed");
        el.classList.remove(
          "is-pending-remove",
          "is-resizing",
          "is-dragging",
          "is-swap-target",
          "is-swap-ready",
          "is-swapped",
          "is-resize-blocked",
          "is-collision-target"
        );
      } else {
        el.hidden = false;
        el.classList.remove(
          "is-removed",
          "is-pending-remove",
          "is-resizing",
          "is-dragging",
          "is-swap-target",
          "is-swap-ready",
          "is-swapped",
          "is-resize-blocked",
          "is-collision-target"
        );
      }

      if (meta) {
        if (meta.name) el.dataset.widgetName = meta.name;
        const titleEl = getWidgetTitleEl(el);
        if (titleEl && meta.titleHtml != null) titleEl.innerHTML = meta.titleHtml;
      }

      if (editing) {
        el.querySelector(".widget-chrome")?.remove();
        if (!shouldHide) ensureChrome(el);
      }
    });

    refreshEmptyRows();
    visibilitySnapshot.clear();
    widgets().forEach((w) => visibilitySnapshot.set(w.dataset.widgetId, !w.hidden));
    snapshotSizes();
    window.dispatchEvent(new Event("resize"));
  }

  function cancelEdit() {
    dirtySizeIds.clear();
    widgets().forEach((el) => {
      const id = el.dataset.widgetId;
      const wasVisible = visibilitySnapshot.get(id);
      if (wasVisible) {
        el.hidden = false;
        el.classList.remove("is-pending-remove", "is-removed");
      } else {
        el.hidden = true;
        el.classList.add("is-removed");
        el.classList.remove("is-pending-remove");
      }
      el.classList.remove(
        "is-pending-remove",
        "is-swap-target",
        "is-swap-ready",
        "is-swapped",
        "is-resize-blocked",
        "is-collision-target"
      );
    });
    refreshEmptyRows();
    if (orderSnapshot) applyOrderMap(orderSnapshot);
    restoreSizeSnapshot();
    applyPersistedSizes();
    exitEdit();
  }

  function saveEdit() {
    const removed = loadRemoved();
    const sizes = loadSizes();
    widgets().forEach((el) => {
      const id = el.dataset.widgetId;
      const isPending = pendingRemove.has(id) || el.classList.contains("is-pending-remove");
      const isRemovedOrHidden = isPending || el.hidden || el.classList.contains("is-removed");

      if (isRemovedOrHidden) {
        el.hidden = true;
        el.classList.add("is-removed");
        el.classList.remove("is-pending-remove");
        removed.add(id);
        delete sizes[id];
        dirtySizeIds.delete(id);
      } else {
        el.hidden = false;
        el.classList.remove("is-removed", "is-pending-remove");
        removed.delete(id);
        if (dirtySizeIds.has(id) || el.classList.contains("has-custom-size")) {
          sizes[id] = captureWidgetSize(el);
        }
      }
    });
    refreshEmptyRows();
    saveRemoved(removed);
    saveSizes(sizes);
    saveOrder();
    dirtySizeIds.clear();
    exitEdit();
    applyPersistedSizes();
  }

  function placedIds() {
    return new Set(
      widgets()
        .filter((w) => !w.hidden && !w.classList.contains("is-removed") && !pendingRemove.has(w.dataset.widgetId))
        .map((w) => w.dataset.widgetId)
    );
  }

  /** 위젯의 현재 그리드 영역(1-indexed 시작/끝 및 span) 조회 */
  function getWidgetGridPlacement(el) {
    if (!el) return null;
    const id = el.dataset.widgetId;
    const colMatch = el.style.gridColumn?.match(/(\d+)\s*\/\s*(\d+)/);
    const rowMatch = el.style.gridRow?.match(/(\d+)\s*\/\s*(\d+)/);
    if (colMatch && rowMatch) {
      const colStart = parseInt(colMatch[1], 10);
      const colEnd = parseInt(colMatch[2], 10);
      const rowStart = parseInt(rowMatch[1], 10);
      const rowEnd = parseInt(rowMatch[2], 10);
      return {
        colStart,
        colEnd,
        rowStart,
        rowEnd,
        colSpan: colEnd - colStart,
        rowSpan: rowEnd - rowStart,
      };
    }
    if (!el.hidden && !el.classList.contains("is-removed")) {
      const box = readBoardBox(el);
      if (box.w > 0 && box.h > 0) {
        const snapped = snapBoxToGrid(box.left, box.top, box.w, box.h);
        return {
          colStart: snapped.colStart,
          colEnd: snapped.colEnd,
          rowStart: snapped.rowStart,
          rowEnd: snapped.rowEnd,
          colSpan: snapped.colSpan,
          rowSpan: snapped.rowSpan,
        };
      }
    }
    return DEFAULT_WIDGET_SPANS[id] || null;
  }

  /** 현재 보드의 24×20 점유 맵 생성 (점유된 칸에 widgetId 기록) */
  function getBoardOccupancyGrid() {
    const grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    widgets().forEach((w) => {
      const id = w.dataset.widgetId;
      if (w.hidden || w.classList.contains("is-removed") || pendingRemove.has(id)) {
        return;
      }
      const placement = getWidgetGridPlacement(w);
      if (!placement) return;

      const r0 = Math.max(0, Math.min(GRID_ROWS, placement.rowStart - 1));
      const r1 = Math.max(0, Math.min(GRID_ROWS, placement.rowEnd - 1));
      const c0 = Math.max(0, Math.min(GRID_COLS, placement.colStart - 1));
      const c1 = Math.max(0, Math.min(GRID_COLS, placement.colEnd - 1));

      for (let r = r0; r < r1; r++) {
        for (let c = c0; c < c1; c++) {
          grid[r][c] = id;
        }
      }
    });
    return grid;
  }

  /** 지정된 직사각형 슬롯이 비어있는지 검사 */
  function isSlotAvailable(grid, colStart, colEnd, rowStart, rowEnd, ignoreWidgetId = null) {
    const r0 = rowStart - 1;
    const r1 = rowEnd - 1;
    const c0 = colStart - 1;
    const c1 = colEnd - 1;

    if (r0 < 0 || r1 > GRID_ROWS || c0 < 0 || c1 > GRID_COLS) return false;

    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) {
        const occupant = grid[r][c];
        if (occupant !== null && occupant !== ignoreWidgetId) {
          return false;
        }
      }
    }
    return true;
  }

  /** 보드 전체에서 colSpan × rowSpan 크기의 연속된 빈 슬롯 탐색 */
  function findFreeGridSlot(grid, colSpan, rowSpan, ignoreWidgetId = null) {
    for (let r = 0; r <= GRID_ROWS - rowSpan; r++) {
      for (let c = 0; c <= GRID_COLS - colSpan; c++) {
        if (isSlotAvailable(grid, c + 1, c + colSpan + 1, r + 1, r + rowSpan + 1, ignoreWidgetId)) {
          return {
            colStart: c + 1,
            colEnd: c + colSpan + 1,
            rowStart: r + 1,
            rowEnd: r + rowSpan + 1,
          };
        }
      }
    }
    return null;
  }

  /** 보드에 비어있는 셀 개수 계산 */
  function getFreeCellCount(grid) {
    let count = 0;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (grid[r][c] === null) count++;
      }
    }
    return count;
  }

  /**
   * 보드에서 위젯이 들어갈 수 있는 최적의 슬롯 탐색 (원래 크기 -> 적응형 축소 크기)
   */
  function findBestAvailableSlot(grid, targetColSpan, targetRowSpan, ignoreWidgetId = null) {
    const minCol = MIN_COL_SPAN;
    const minRow = MIN_ROW_SPAN;
    const maxCol = Math.min(GRID_COLS, Math.max(minCol, targetColSpan));
    const maxRow = Math.min(GRID_ROWS, Math.max(minRow, targetRowSpan));

    // 1. 선호 크기 완전 일치
    let slot = findFreeGridSlot(grid, maxCol, maxRow, ignoreWidgetId);
    if (slot) return slot;

    // 2. 가로/세로를 점진적으로 줄이며 들어갈 수 있는 최대 직사각형 공간 탐색
    for (let cs = maxCol; cs >= minCol; cs--) {
      for (let rs = maxRow; rs >= minRow; rs--) {
        slot = findFreeGridSlot(grid, cs, rs, ignoreWidgetId);
        if (slot) return slot;
      }
    }

    // 3. 최소 3x3 사각 영역 탐색
    return findFreeGridSlot(grid, minCol, minRow, ignoreWidgetId);
  }

  /**
   * 특정 위젯을 보드에 배치할 공간이 있는지 검사
   * - 보드에 빈 칸이 1칸이라도 존재하면 위젯 추가 가능!
   * - 보드가 100% 완전 포화(빈 셀 0개)일 때만 공간 부족!
   */
  function checkWidgetSpace(widgetId) {
    const grid = getBoardOccupancyGrid();

    const sizes = loadSizes();
    const stored = sizes[widgetId];
    const def =
      stored && hasStoredSize(stored)
        ? stored
        : DEFAULT_WIDGET_SPANS[widgetId] || { colSpan: 6, rowSpan: 6, colStart: 1, colEnd: 7, rowStart: 1, rowEnd: 7 };

    const targetColSpan = def.colSpan || (def.colEnd - def.colStart) || 6;
    const targetRowSpan = def.rowSpan || (def.rowEnd - def.rowStart) || 6;

    // 1. 선호(기존) 위치가 완전히 비어있는지 확인
    if (def.colStart && def.rowStart && isSlotAvailable(grid, def.colStart, def.colEnd, def.rowStart, def.rowEnd, widgetId)) {
      return {
        hasSpace: true,
        slot: { colStart: def.colStart, colEnd: def.colEnd, rowStart: def.rowStart, rowEnd: def.rowEnd },
        isOriginal: true,
      };
    }

    // 2. 보드 내 적응형 슬롯 탐색 (원래 크기 -> 가능한 크기, 다른 위젯과 겹치지 않는 완전한 빈 사각 슬롯)
    const slot = findBestAvailableSlot(grid, targetColSpan, targetRowSpan, widgetId);
    if (slot) {
      return {
        hasSpace: true,
        slot: slot,
        isOriginal: false,
      };
    }

    // 3. 다른 위젯과 겹치지 않고 들어갈 수 있는 공간이 전혀 없으면 추가 불가
    return {
      hasSpace: false,
      slot: null,
      isOriginal: false,
    };
  }

  /** 세련된 피드백 토스트 알림 띄우기 (경고, 성공, 일반) */
  let toastTimer = null;
  function showToast(message, type = "info") {
    let container = document.querySelector(".board-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "board-toast-container";
      document.body.appendChild(container);
    }

    const existing = container.querySelector(".board-toast");
    if (existing) {
      existing.remove();
      if (toastTimer) clearTimeout(toastTimer);
    }

    const toast = document.createElement("div");
    toast.className = `board-toast is-${type}`;

    let iconClass = "bi-info-circle-fill";
    if (type === "warning") iconClass = "bi-exclamation-triangle-fill";
    else if (type === "success") iconClass = "bi-check-circle-fill";

    toast.innerHTML = `
      <span class="board-toast-icon"><i class="bi ${iconClass}"></i></span>
      <span class="board-toast-text">${message}</span>
    `;

    container.appendChild(toast);

    toastTimer = setTimeout(() => {
      toast.classList.add("is-leaving");
      setTimeout(() => {
        toast.remove();
      }, 230);
    }, 3200);
  }

  function availableCatalog() {
    const placed = placedIds();
    // 보드에 이미 있는 위젯 + 카탈로그 중 미배치만
    // 삭제 대기 중인 보드 위젯은 다시 추가 가능하도록 카탈로그에 임시 노출
    const fromBoard = widgets()
      .filter((w) => pendingRemove.has(w.dataset.widgetId) || w.hidden || w.classList.contains("is-removed"))
      .map((w) => ({
        id: w.dataset.widgetId,
        name: w.dataset.widgetName || w.dataset.widgetId,
        category: w.dataset.widgetCategory || "모니터링",
        icon: categoryIcon(w.dataset.widgetCategory),
        restore: true,
      }));

    const fromCatalog = WIDGET_CATALOG.filter((item) => !placed.has(item.id)).map((item) => ({
      ...item,
      restore: false,
    }));

    const merged = [...fromBoard, ...fromCatalog];
    const seen = new Set();
    return merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  function categoryIcon(category) {
    if (category === "차트") return "bi-bar-chart";
    if (category === "모니터링") return "bi-display";
    if (category === "사용자 정의") return "bi-sliders";
    return "bi-info-circle";
  }

  function renderCatalog() {
    let items = availableCatalog();
    if (filterCategory !== "all") {
      items = items.filter((i) => i.category === filterCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
      );
    }

    if (!items.length) {
      catalogList.innerHTML = `
        <div class="wcat-empty">
          <i class="bi bi-grid-3x3-gap"></i>
          <p>추가할 수 있는 위젯이 없습니다</p>
          <span>곧 더 많은 위젯이 제공될 예정입니다</span>
        </div>
      `;
      return;
    }

    catalogList.innerHTML = items
      .map((item) => {
        const spaceInfo = checkWidgetSpace(item.id);
        const isSpaceFull = !spaceInfo.hasSpace;
        const fullBadge = isSpaceFull
          ? `<span class="wcat-badge-full"><i class="bi bi-exclamation-triangle"></i>공간 부족</span>`
          : "";
        const itemClass = `wcat-item${isSpaceFull ? " is-space-full" : ""}`;
        const btnClass = `wcat-add${isSpaceFull ? " is-disabled" : ""}`;
        const btnTitle = isSpaceFull ? "공간 부족 (위젯 크기 조절 또는 삭제 필요)" : `${item.name} 추가`;

        return `
          <div class="${itemClass}" data-id="${item.id}" data-restore="${item.restore ? "1" : "0"}" data-space-full="${isSpaceFull ? "1" : "0"}">
            <div class="wcat-icon"><i class="bi ${item.icon || categoryIcon(item.category)}"></i></div>
            <div class="wcat-meta">
              <div class="wcat-meta-title-row">
                <strong>${item.name}</strong>
                ${fullBadge}
              </div>
              <span>${item.category}</span>
            </div>
            <button type="button" class="${btnClass}" title="${btnTitle}" aria-label="${item.name} 추가">
              <i class="bi bi-plus-lg"></i>
            </button>
          </div>
        `;
      })
      .join("");

    catalogList.querySelectorAll(".wcat-item").forEach((row) => {
      const id = row.dataset.id;
      const isRestore = row.dataset.restore === "1";
      const isSpaceFull = row.dataset.spaceFull === "1";

      const handleAddAttempt = () => {
        if (isSpaceFull) {
          row.classList.remove("is-shaking");
          void row.offsetWidth; // DOM reflow로 진동 애니메이션 재실행
          row.classList.add("is-shaking");
          showToast(
            "현재 보드에 위젯을 추가할 공간이 부족합니다.<br>기존 위젯의 크기를 줄이거나 삭제한 뒤 추가해 주세요.",
            "warning"
          );
          return;
        }
        addWidget(id, isRestore);
      };

      row.querySelector(".wcat-add").addEventListener("click", (e) => {
        e.stopPropagation();
        handleAddAttempt();
      });

      row.addEventListener("click", () => {
        handleAddAttempt();
      });
    });
  }

  function addWidget(id, restore) {
    const spaceInfo = checkWidgetSpace(id);
    if (!spaceInfo.hasSpace || !spaceInfo.slot) {
      showToast(
        "현재 보드에 위젯을 추가할 공간이 부족합니다.<br>기존 위젯의 크기를 줄이거나 삭제한 뒤 추가해 주세요.",
        "warning"
      );
      return;
    }

    const el = document.querySelector(`.widget[data-widget-id="${id}"]`);
    const name = el?.dataset?.widgetName || id;

    if (el) {
      lockWidgetOnGrid(el, spaceInfo.slot.colStart, spaceInfo.slot.colEnd, spaceInfo.slot.rowStart, spaceInfo.slot.rowEnd);
      dirtySizeIds.add(id);

      el.hidden = false;
      el.classList.remove("is-removed", "is-pending-remove");
      pendingRemove.delete(id);
      el.querySelector(".widget-chrome")?.remove();
      ensureChrome(el);
      refreshEmptyRows();
      window.dispatchEvent(new Event("resize"));

      showToast(`'${name}' 위젯이 보드에 추가되었습니다.`, "success");
      renderCatalog();
      return;
    }

    // 신규 카탈로그 위젯: 추후 템플릿 렌더 연결
    console.info("[widget] add not implemented yet:", id);
    renderCatalog();
  }

  function openModal() {
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    searchQuery = "";
    searchInput.value = "";
    filterCategory = "all";
    document.querySelectorAll(".wfilter").forEach((btn) => {
      const on = btn.dataset.filter === "all";
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    renderCatalog();
    searchInput.focus();
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }

  btnEdit.addEventListener("click", enterEdit);
  btnCancel.addEventListener("click", cancelEdit);
  btnSave.addEventListener("click", saveEdit);
  btnAdd.addEventListener("click", openModal);
  btnReset.addEventListener("click", resetLayout);

  modal.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  settingsModal.querySelectorAll("[data-close-settings]").forEach((el) => {
    el.addEventListener("click", closeSettings);
  });
  settingsSaveBtn.addEventListener("click", saveSettings);
  settingsTitleInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveSettings();
    }
  });

  document.querySelectorAll(".wfilter").forEach((btn) => {
    btn.addEventListener("click", () => {
      filterCategory = btn.dataset.filter;
      document.querySelectorAll(".wfilter").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      renderCatalog();
    });
  });

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim();
    renderCatalog();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!settingsModal.hidden) closeSettings();
      else if (!modal.hidden) closeModal();
      else if (editing) cancelEdit();
    }
  });

  captureDefaultMeta();
  defaultOrder = captureOrderMap();
  applyPersistedRemoval();
  applyPersistedOrder();
  applyPersistedSizes();
  bindBoardReflow();

  // 초기 깜빡임 방지용 고속 인라인 스타일(#persisted-layout-fast)의 역할을 DOM 인라인으로 온전히 인계 후 태그 제거
  const fastStyle = document.getElementById("persisted-layout-fast");
  if (fastStyle) {
    fastStyle.remove();
  }
})();
