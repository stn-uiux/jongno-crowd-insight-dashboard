(function () {
  const STORAGE_KEY = "jongno-dashboard-removed-widgets";
  /** v14: 그리드 리사이즈/드래그 충돌 검사 버그 수정 (가로/세로 독립 축 검사) */
  const SIZE_KEY = "jongno-dashboard-widget-sizes-v14";
  try {
    localStorage.removeItem("jongno-dashboard-widget-sizes-v9");
    localStorage.removeItem("jongno-dashboard-widget-sizes-v10");
    localStorage.removeItem("jongno-dashboard-widget-sizes-v11");
    localStorage.removeItem("jongno-dashboard-widget-sizes-v12");
    localStorage.removeItem("jongno-dashboard-widget-sizes-v13");
  } catch (_) {}
  const ORDER_KEY = "jongno-dashboard-widget-order";
  const MIN_W = 160;
  const MIN_H = 100;
  const GRID_COLS = 24;
  const GRID_ROWS = 10;

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

  /** 24×10 균등 칸 메트릭 (칸 크기 + gap) */
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

  /** 위치·크기를 24×10 칸에 스냅 (인접 위젯 사이 gap 자동 확보) */
  function snapBoxToGrid(left, top, w, h) {
    const { gap, colW, rowH, pitchX, pitchY, width, height } = getGridMetrics();
    let c0 = Math.round(left / pitchX);
    let r0 = Math.round(top / pitchY);
    c0 = Math.max(0, Math.min(GRID_COLS - 1, c0));
    r0 = Math.max(0, Math.min(GRID_ROWS - 1, r0));

    let colSpan = Math.max(1, Math.round((w + gap) / pitchX));
    let rowSpan = Math.max(1, Math.round((h + gap) / pitchY));
    colSpan = Math.min(colSpan, GRID_COLS - c0);
    rowSpan = Math.min(rowSpan, GRID_ROWS - r0);

    // 최소 px 보장 — 칸이 작으면 스팬 늘림
    while (colSpan < GRID_COLS - c0 && spanSize(colSpan, colW, gap) < MIN_W) colSpan += 1;
    while (rowSpan < GRID_ROWS - r0 && spanSize(rowSpan, rowH, gap) < MIN_H) rowSpan += 1;

    left = c0 * pitchX;
    top = r0 * pitchY;
    w = Math.min(spanSize(colSpan, colW, gap), width - left);
    h = Math.min(spanSize(rowSpan, rowH, gap), height - top);
    return {
      left: Math.round(left),
      top: Math.round(top),
      w: Math.round(Math.max(MIN_W, w)),
      h: Math.round(Math.max(MIN_H, h)),
    };
  }

  /**
   * 앞으로 추가할 위젯 카탈로그.
   * 보드에 없는 id만 모달에 노출됩니다.
   * 예: { id, name, category, icon }
   */
  const WIDGET_CATALOG = [
    { id: "zone-list", name: "구역 리스트", category: "모니터링", icon: "bi-list-ul" },
  ];

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
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  function saveRemoved(ids) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  }

  function loadSizes() {
    try {
      const raw = localStorage.getItem(SIZE_KEY);
      return raw ? JSON.parse(raw) : {};
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
    const board = getBoardSize();
    const box = readBoardBox(el);
    const bw = Math.max(1, board.width);
    const bh = Math.max(1, board.height);
    return {
      basis: "board",
      leftRatio: Math.max(0, Math.min(1, box.left / bw)),
      topRatio: Math.max(0, Math.min(1, box.top / bh)),
      widthRatio: Math.max(0, Math.min(1, box.w / bw)),
      heightRatio: Math.max(0, Math.min(1, box.h / bh)),
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
    w = Math.max(MIN_W, Math.min(w, bw));
    h = Math.max(MIN_H, Math.min(h, bh));
    left = Math.max(0, Math.min(left, bw - w));
    top = Math.max(0, Math.min(top, bh - h));
    return { left, top, w, h, bw, bh };
  }

  /**
   * 보드 절대배치. 구조 스타일은 .has-custom-size CSS, 좌표만 인라인 %.
   */
  function lockWidgetOnBoard(el, left, top, w, h, boardSize) {
    const board = boardSize || getBoardSize();
    const bw = Math.max(1, board.width);
    const bh = Math.max(1, board.height);
    w = Math.max(MIN_W, Math.min(Math.round(w), bw));
    h = Math.max(MIN_H, Math.min(Math.round(h), bh));
    left = Math.max(0, Math.min(Math.round(left), bw - w));
    top = Math.max(0, Math.min(Math.round(top), bh - h));

    el.classList.add("has-custom-size");
    // 예전에 !important 로 박아둔 잔여 인라인 제거
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

    el.style.left = `${((left / bw) * 100).toFixed(3)}%`;
    el.style.top = `${((top / bh) * 100).toFixed(3)}%`;
    el.style.width = `${((w / bw) * 100).toFixed(3)}%`;
    el.style.height = `${((h / bh) * 100).toFixed(3)}%`;
  }

  function applyWidgetSize(el, size, boardSize) {
    if (!el || !size || !hasStoredSize(size)) return;
    const { left, top, w, h } = resolveBoardBox(size, boardSize);
    lockWidgetOnBoard(el, left, top, w, h, boardSize || getBoardSize());
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
    widgets().forEach((el) => {
      if (removed.has(el.dataset.widgetId)) {
        el.hidden = true;
        el.style.display = "none";
        el.classList.add("is-removed");
      }
    });
    refreshEmptyRows();
  }

  function hasStoredSize(size) {
    return !!(
      size &&
      size.basis === "board" &&
      size.leftRatio != null &&
      size.topRatio != null &&
      size.widthRatio != null &&
      size.heightRatio != null
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
    return el && !el.hidden && el.style.display !== "none" && !el.classList.contains("is-removed");
  }

  /** 다른 위젯 화면 영역 (리사이즈/드래그 충돌용) */
  function getObstacles(active) {
    return widgets()
      .filter((w) => w !== active && isWidgetVisible(w))
      .map((w) => {
        const r = w.getBoundingClientRect();
        return { el: w, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
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
   * - 아래(S)/위(N) 리사이즈 시: 가로(X) 방향으로 실제 겹치는 위젯에만 반응 (옆 열 위젯 간섭 방지)
   * - 오른쪽(E)/왼쪽(W) 리사이즈 시: 세로(Y) 방향으로 실제 겹치는 위젯에만 반응 (위/아래 행 위젯 간섭 방지)
   * - 드래그(drag) 이동 시: X와 Y 양방향 모두 gap 이내로 침범했을 때만 부드럽게 밀어냄
   * @returns {{ left, top, w, h, blocked, hitting }}
   */
  function clampToObstacles(baseLeft, baseTop, left, top, w, h, dir, obstacles, gap = collisionGap()) {
    let vl = baseLeft + left;
    let vt = baseTop + top;
    let blocked = false;
    const hitting = [];

    for (const o of obstacles) {
      let vr = vl + w;
      let vb = vt + h;

      // 1) 드래그(drag) 이동 시: X와 Y 양방향 모두에서 gap 이내로 침범했을 때만 충돌
      if (dir === "drag") {
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
        blocked = true;
        hitting.push(o);
        continue;
      }

      // 2) 리사이즈(resize) 시:
      // 아래쪽(S) 또는 위쪽(N) 크기 조절은 "가로(X) 방향으로 실제 겹치는 장애물"에만 반응
      const hOverlap = Math.min(vr, o.right) - Math.max(vl, o.left);
      // 오른쪽(E) 또는 왼쪽(W) 크기 조절은 "세로(Y) 방향으로 실제 겹치는 장애물"에만 반응
      const vOverlap = Math.min(vb, o.bottom) - Math.max(vt, o.top);

      let hit = false;

      // 동쪽(E): 오른쪽으로 늘릴 때 — 세로(Y)가 겹치고 장애물이 오른쪽에 있는 경우
      if (dir.includes("e") && vOverlap > COLLISION_EPS && o.left >= vl && vr > o.left - gap + COLLISION_EPS) {
        const maxW = Math.max(MIN_W, o.left - gap - vl);
        if (maxW < w) {
          w = maxW;
          hit = true;
        }
      }

      // 서쪽(W): 왼쪽으로 늘릴 때 — 세로(Y)가 겹치고 장애물이 왼쪽에 있는 경우
      if (dir.includes("w") && vOverlap > COLLISION_EPS && o.right <= vr && vl < o.right + gap - COLLISION_EPS) {
        const newLeft = o.right + gap;
        const newW = vr - newLeft;
        if (newW >= MIN_W && newLeft > vl) {
          left += newLeft - vl;
          vl = newLeft;
          w = newW;
          hit = true;
        } else if (newW < MIN_W) {
          hit = true;
        }
      }

      // 남쪽(S): 아래로 늘릴 때 — 가로(X)가 겹치고 장애물이 아래쪽에 있는 경우
      if (dir.includes("s") && hOverlap > COLLISION_EPS && o.top >= vt && vb > o.top - gap + COLLISION_EPS) {
        const maxH = Math.max(MIN_H, o.top - gap - vt);
        if (maxH < h) {
          h = maxH;
          hit = true;
        }
      }

      // 북쪽(N): 위로 늘릴 때 — 가로(X)가 겹치고 장애물이 위쪽에 있는 경우
      if (dir.includes("n") && hOverlap > COLLISION_EPS && o.bottom <= vb && vt < o.bottom + gap - COLLISION_EPS) {
        const newTop = o.bottom + gap;
        const newH = vb - newTop;
        if (newH >= MIN_H && newTop > vt) {
          top += newTop - vt;
          vt = newTop;
          h = newH;
          hit = true;
        } else if (newH < MIN_H) {
          hit = true;
        }
      }

      if (hit) {
        blocked = true;
        hitting.push(o);
      }
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

  function startResize(e, widget, dir) {
    e.preventDefault();
    e.stopPropagation();
    if (e.button != null && e.button !== 0) return;

    const board = getBoardSize();
    const br = getBoardRect();
    if (!br) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const start = readBoardBox(widget);
    const obstacles = getObstacles(widget);
    const gap = collisionGap();

    widget.classList.add("is-resizing", "has-custom-size");
    if (dir === "drag") widget.classList.add("is-dragging");
    lockWidgetOnBoard(widget, start.left, start.top, start.w, start.h, board);

    const applyLive = (left, top, w, h) => {
      widget.style.left = `${left}px`;
      widget.style.top = `${top}px`;
      widget.style.width = `${w}px`;
      widget.style.height = `${h}px`;
    };

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
      } else {
        // "drag" 문자열에 "e"가 포함되므로 includes 전에 drag 분기 필수
        if (dir.includes("e")) w = start.w + dx;
        if (dir.includes("w")) {
          left = start.left + dx;
          w = start.w - dx;
        }
        if (dir.includes("s")) h = start.h + dy;
        if (dir.includes("n")) {
          top = start.top + dy;
          h = start.h - dy;
        }
        if (dir.includes("w") && w < MIN_W) {
          left = start.left + start.w - MIN_W;
          w = MIN_W;
        }
        if (dir.includes("n") && h < MIN_H) {
          top = start.top + start.h - MIN_H;
          h = MIN_H;
        }
        ({ left, top, w, h } = snapBoxToGrid(left, top, w, h));
      }

      // 보드 밖으로 못 나감 → 다시 칸 스냅
      let clamped = clampToBoard(br.left, br.top, left, top, w, h, dir);
      ({ left, top, w, h } = snapBoxToGrid(clamped.left, clamped.top, clamped.w, clamped.h));

      // 다른 위젯과 최소 gap 유지 (이후 재스냅 안 함 — 간격 우선)
      let hit = clampToObstacles(br.left, br.top, left, top, w, h, dir, obstacles, gap);
      left = hit.left;
      top = hit.top;
      w = hit.w;
      h = hit.h;
      // 여러 장애물일 때 한 번 더
      if (hit.blocked) {
        hit = clampToObstacles(br.left, br.top, left, top, w, h, dir, obstacles, gap);
        left = hit.left;
        top = hit.top;
        w = hit.w;
        h = hit.h;
      }
      setCollisionVisuals(widget, hit.hitting);

      applyLive(left, top, w, h);
      window.dispatchEvent(new Event("resize"));
    };

    const onUp = () => {
      widget.classList.remove("is-resizing", "is-dragging");
      clearCollisionVisuals();
      let box = readBoardBox(widget);
      box = snapBoxToGrid(box.left, box.top, box.w, box.h);
      const hit = clampToObstacles(br.left, br.top, box.left, box.top, box.w, box.h, dir, obstacles, gap);
      lockWidgetOnBoard(widget, hit.left, hit.top, hit.w, hit.h, getBoardSize());
      if (widget.dataset.widgetId) dirtySizeIds.add(widget.dataset.widgetId);
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
    widget.style.display = "none";
    refreshEmptyRows();
    window.dispatchEvent(new Event("resize"));
  }

  function enterEdit() {
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
    widgets().forEach((w) => w.classList.remove("is-resizing", "is-dragging", "is-swap-target"));
    pendingRemove = new Set();
  }

  function captureDefaultMeta() {
    defaultMeta.clear();
    widgets().forEach((el) => {
      const titleEl = getWidgetTitleEl(el);
      defaultMeta.set(el.dataset.widgetId, {
        name: el.dataset.widgetName || "",
        titleHtml: titleEl ? titleEl.innerHTML : null,
      });
    });
  }

  /** 처음 HTML 배치·크기·제목으로 복구 (저장값도 비움) */
  function resetLayout() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SIZE_KEY);
    localStorage.removeItem(ORDER_KEY);
    pendingRemove = new Set();
    dirtySizeIds.clear();
    if (defaultOrder) applyOrderMap(defaultOrder);

    widgets().forEach((el) => {
      clearWidgetSize(el);
      el.hidden = false;
      el.style.display = "";
      el.classList.remove("is-removed", "is-pending-remove", "is-resizing", "is-dragging");

      const meta = defaultMeta.get(el.dataset.widgetId);
      if (meta) {
        if (meta.name) el.dataset.widgetName = meta.name;
        const titleEl = getWidgetTitleEl(el);
        if (titleEl && meta.titleHtml != null) titleEl.innerHTML = meta.titleHtml;
      }

      if (editing) {
        el.querySelector(".widget-chrome")?.remove();
        ensureChrome(el);
      }
    });

    refreshEmptyRows();
    visibilitySnapshot.clear();
    widgets().forEach((w) => visibilitySnapshot.set(w.dataset.widgetId, true));
    snapshotSizes();
    window.dispatchEvent(new Event("resize"));
  }

  function cancelEdit() {
    dirtySizeIds.clear();
    pendingRemove.forEach((id) => {
      const el = document.querySelector(`.widget[data-widget-id="${id}"]`);
      if (!el) return;
      if (visibilitySnapshot.get(id)) {
        el.hidden = false;
        el.style.display = "";
        el.classList.remove("is-pending-remove", "is-removed");
      }
    });
    widgets().forEach((w) => w.classList.remove("is-pending-remove"));
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
      if (pendingRemove.has(id) || el.classList.contains("is-pending-remove")) {
        el.hidden = true;
        el.style.display = "none";
        el.classList.add("is-removed");
        el.classList.remove("is-pending-remove");
        removed.add(id);
        delete sizes[id];
        dirtySizeIds.delete(id);
      } else if (!el.hidden) {
        el.classList.remove("is-removed");
        el.style.display = "";
        removed.delete(id);
        if (dirtySizeIds.has(id) || el.classList.contains("has-custom-size")) {
          sizes[id] = captureWidgetSize(el);
        }
      }
    });
    refreshEmptyRows();
    saveRemoved(removed);
    saveSizes(sizes);
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

  function availableCatalog() {
    const placed = placedIds();
    // 보드에 이미 있는 위젯 + 카탈로그 중 미배치만
    // 삭제 대기 중인 보드 위젯은 다시 추가 가능하도록 카탈로그에 임시 노출
    const fromBoard = widgets()
      .filter((w) => pendingRemove.has(w.dataset.widgetId) || w.hidden || w.classList.contains("is-removed"))
      .map((w) => ({
        id: w.dataset.widgetId,
        name: w.dataset.widgetName || w.dataset.widgetId,
        category: w.dataset.widgetCategory || "정보",
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
      .map(
        (item) => `
      <div class="wcat-item" data-id="${item.id}" data-restore="${item.restore ? "1" : "0"}">
        <div class="wcat-icon"><i class="bi ${item.icon || categoryIcon(item.category)}"></i></div>
        <div class="wcat-meta">
          <strong>${item.name}</strong>
          <span>${item.category}</span>
        </div>
        <button type="button" class="wcat-add" title="추가" aria-label="${item.name} 추가">
          <i class="bi bi-plus-lg"></i>
        </button>
      </div>`
      )
      .join("");

    catalogList.querySelectorAll(".wcat-item").forEach((row) => {
      row.querySelector(".wcat-add").addEventListener("click", () => {
        addWidget(row.dataset.id, row.dataset.restore === "1");
      });
    });
  }

  function addWidget(id, restore) {
    if (restore) {
      const el = document.querySelector(`.widget[data-widget-id="${id}"]`);
      if (el) {
        el.hidden = false;
        el.style.display = "";
        el.classList.remove("is-removed", "is-pending-remove");
        pendingRemove.delete(id);
        el.querySelector(".widget-chrome")?.remove();
        ensureChrome(el);
        refreshEmptyRows();
        window.dispatchEvent(new Event("resize"));
      }
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
})();
