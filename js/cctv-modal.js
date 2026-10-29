(function () {
  const modal = document.getElementById("cctv-modal");
  const panel = document.getElementById("cctv-panel");
  const handle = document.getElementById("cctv-drag-handle");
  const btnClose = document.getElementById("cctv-close");
  const btnPlay = document.getElementById("cctv-play");
  const zoneEl = document.getElementById("cctv-zone-id");
  const titleEl = document.getElementById("cctv-title");
  const addressEl = document.getElementById("cctv-address");
  const stampEl = document.getElementById("cctv-stamp");
  const feedImg = document.getElementById("cctv-feed-img");
  const ptz = document.getElementById("cctv-ptz");
  const iconPlay = btnPlay?.querySelector(".icon-play");
  const iconPause = btnPlay?.querySelector(".icon-pause");
  if (!modal || !panel || !handle || !btnClose || !btnPlay) return;

  const META = {
    // A구역: 헌법 재판소 일대 (A-1 ~ A-21)
    "A-1": { title: "북촌로 북단 CCTV", address: "서울 종로구 북촌로 70" },
    "A-2": { title: "정독도서관 앞 CCTV", address: "서울 종로구 북촌로5길 20" },
    "A-3": { title: "북촌한옥마을 입구 CCTV", address: "서울 종로구 북촌로11길 1" },
    "A-4": { title: "가회동 북단 CCTV", address: "서울 종로구 북촌로 63" },
    "A-5": { title: "화동 북단 CCTV", address: "서울 종로구 북촌로 57" },
    "A-6": { title: "북촌로 북측 CCTV", address: "서울 종로구 북촌로 51" },
    "A-7": { title: "백인제가옥 입구 CCTV", address: "서울 종로구 북촌로7길 16" },
    "A-8": { title: "가회동 골목 CCTV", address: "서울 종로구 북촌로 45" },
    "A-9": { title: "북촌로 중앙 CCTV", address: "서울 종로구 북촌로 39" },
    "A-10": { title: "화동 골목 CCTV", address: "서울 종로구 북촌로 33" },
    "A-11": { title: "서울교육박물관 앞 CCTV", address: "서울 종로구 북촌로5길 48" },
    "A-12": { title: "북촌로 교차로 CCTV", address: "서울 종로구 북촌로 28" },
    "A-13": { title: "헌법재판소 동측 CCTV", address: "서울 종로구 북촌로 21" },
    "A-14": { title: "헌법재판소 정문 CCTV", address: "서울 종로구 북촌로 15" },
    "A-15": { title: "가회동주민센터 앞 CCTV", address: "서울 종로구 북촌로 25" },
    "A-16": { title: "재동초교 앞 CCTV", address: "서울 종로구 북촌로 18" },
    "A-17": { title: "북촌로 남측 CCTV", address: "서울 종로구 북촌로 12" },
    "A-18": { title: "북촌로 입구 CCTV", address: "서울 종로구 북촌로 4" },
    "A-19": { title: "안국역 3번출구 CCTV", address: "서울 종로구 율곡로 60" },
    "A-20": { title: "안국역 앞 CCTV", address: "서울 종로구 율곡로 53" },
    "A-21": { title: "윤보선길 CCTV", address: "서울 종로구 윤보선길 24" },

    // B구역: 광화문 광장 접점 (B-1 ~ B-6)
    "B-1": { title: "광화문 광장 북측 CCTV", address: "서울 종로구 세종대로 175" },
    "B-2": { title: "세종대로 교차로 CCTV", address: "서울 종로구 세종대로 172" },
    "B-3": { title: "광화문 광장 서측 CCTV", address: "서울 종로구 사직로8길 4" },
    "B-4": { title: "세종문화회관 앞 CCTV", address: "서울 종로구 세종대로 175" },
    "B-5": { title: "광화문 광장 중앙 CCTV", address: "서울 종로구 세종대로 165" },
    "B-6": { title: "광화문역 9번출구 CCTV", address: "서울 종로구 세종대로 160" },

    // C구역: 낙원동 (C-1 ~ C-10)
    "C-1": { title: "낙원동 북측 CCTV", address: "서울 종로구 삼일대로 446" },
    "C-2": { title: "낙원동 동북 CCTV", address: "서울 종로구 돈화문로11길 38" },
    "C-3": { title: "낙원동 서측 CCTV", address: "서울 종로구 인사동길 44" },
    "C-4": { title: "낙원떡집거리 CCTV", address: "서울 종로구 삼일대로 436" },
    "C-5": { title: "낙원상가 북단 CCTV", address: "서울 종로구 삼일대로 428" },
    "C-6": { title: "돈화문로 골목 CCTV", address: "서울 종로구 돈화문로11길 22" },
    "C-7": { title: "낙원상가 중앙 CCTV", address: "서울 종로구 삼일대로 424" },
    "C-8": { title: "인사동 네거리 CCTV", address: "서울 종로구 인사동길 24" },
    "C-9": { title: "낙원상가 남단 CCTV", address: "서울 종로구 삼일대로 418" },
    "C-10": { title: "종로3가역 5호선 CCTV", address: "서울 종로구 돈화문로11길 5" },

    // D구역: 익선동 (D-1 ~ D-13)
    "D-1": { title: "익선동 입구 CCTV", address: "서울 종로구 익선동 166" },
    "D-2": { title: "익선동 북측 CCTV", address: "서울 종로구 익선동 128" },
    "D-3": { title: "익선동 중앙 CCTV", address: "서울 종로구 익선동 140" },
    "D-4": { title: "익선동 서측 CCTV", address: "서울 종로구 익선동 112" },
    "D-5": { title: "익선동 교차로 CCTV", address: "서울 종로구 익선동 155" },
    "D-6": { title: "익선동 동측 CCTV", address: "서울 종로구 익선동 180" },
    "D-7": { title: "익선동 골목 CCTV", address: "서울 종로구 익선동 98" },
    "D-8": { title: "익선동 남측 CCTV", address: "서울 종로구 익선동 172" },
    "D-9": { title: "익선동 광장 CCTV", address: "서울 종로구 익선동 190" },
    "D-10": { title: "익선동 동남 CCTV", address: "서울 종로구 익선동 201" },
    "D-11": { title: "종로 3가 앞 CCTV", address: "서울 종로구 종로3가 123" },
    "D-12": { title: "익선동 남단 CCTV", address: "서울 종로구 익선동 210" },
    "D-13": { title: "익선동 동단 CCTV", address: "서울 종로구 익선동 220" },
  };

  let playing = false;
  let stampTimer = null;
  let drag = null;
  let activeTipBtn = null;

  // PTZ 카메라 제어 상태 (상하좌우 팬 & 줌인/줌아웃)
  let panX = 0;
  let panY = 0;
  let zoom = 1;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;
  const STEP_PAN = 18;
  const STEP_ZOOM = 0.18;

  function updateCameraTransform() {
    if (!feedImg) return;
    const maxPanX = Math.round(35 + (zoom - 1) * 150);
    const maxPanY = Math.round(25 + (zoom - 1) * 110);
    panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
    panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
    feedImg.style.transform = `scale(${zoom.toFixed(2)}) translate(${panX}px, ${panY}px)`;
  }

  function resetCamera() {
    panX = 0;
    panY = 0;
    zoom = 1;
    if (feedImg) feedImg.style.transform = "";
  }

  function stepAction(action) {
    switch (action) {
      case "up":
        panY += STEP_PAN; // 화면을 위로 조작
        break;
      case "down":
        panY -= STEP_PAN; // 화면을 아래로 조작
        break;
      case "left":
        panX += STEP_PAN; // 화면을 왼쪽으로 조작
        break;
      case "right":
        panX -= STEP_PAN; // 화면을 오른쪽으로 조작
        break;
      case "zoom-in":
        zoom = Math.min(MAX_ZOOM, zoom + STEP_ZOOM);
        break;
      case "zoom-out":
        zoom = Math.max(MIN_ZOOM, zoom - STEP_ZOOM);
        break;
    }
    updateCameraTransform();
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function formatStamp(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function setTipActive(btn, on) {
    document.querySelectorAll(".mp-cctv.is-active").forEach((el) => {
      if (el === btn && on) return;
      el.classList.remove("is-active");
      el.setAttribute("aria-pressed", "false");
    });
    if (!btn) return;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function setPlaying(on) {
    playing = on;
    btnPlay.classList.toggle("is-playing", on);
    btnPlay.setAttribute("aria-pressed", on ? "true" : "false");
    btnPlay.setAttribute("aria-label", on ? "일시정지" : "재생");
    if (iconPlay) iconPlay.hidden = on;
    if (iconPause) iconPause.hidden = !on;
    if (stampTimer) {
      clearInterval(stampTimer);
      stampTimer = null;
    }
    if (on && stampEl) {
      stampEl.textContent = formatStamp(new Date());
      stampTimer = setInterval(() => {
        stampEl.textContent = formatStamp(new Date());
      }, 1000);
    }
  }

  function placePanel() {
    const w = panel.offsetWidth || 720;
    const h = panel.offsetHeight || 480;
    const left = Math.max(24, (window.innerWidth - w) / 2);
    const top = Math.max(24, (window.innerHeight - h) / 2);
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
  }

  function openCctv(pointId, tipBtn) {
    resetCamera();
    const id = pointId || "D-11";
    const meta = META[id] || { title: `${id} CCTV`, address: "서울 종로구 일대" };
    const displayId = id === "B-2-alt" ? "B-2" : id;
    if (zoneEl) zoneEl.textContent = displayId;
    if (titleEl) titleEl.textContent = meta.title;
    if (addressEl) addressEl.textContent = meta.address;
    if (stampEl) stampEl.textContent = formatStamp(new Date());
    activeTipBtn = tipBtn || null;
    setTipActive(activeTipBtn, true);
    setPlaying(true);
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    placePanel();
  }

  function closeCctv() {
    resetCamera();
    setPlaying(false);
    setTipActive(activeTipBtn, false);
    activeTipBtn = null;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }

  btnClose.addEventListener("click", closeCctv);
  btnPlay.addEventListener("click", (e) => {
    e.stopPropagation();
    setPlaying(!playing);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeCctv();
  });

  // 카메라 아이콘 → 모달 (활성 시 일시정지 아이콘으로 전환)
  document.getElementById("map-points")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".mp-cctv");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.classList.contains("is-active") && !modal.hidden) {
      closeCctv();
      return;
    }
    const point = btn.closest(".map-point");
    openCctv(point?.dataset.id || "D-11", btn);
  });

  // 드래그 (헤더)
  handle.addEventListener("pointerdown", (e) => {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest(".cctv-close")) return;
    const rect = panel.getBoundingClientRect();
    drag = {
      ox: e.clientX - rect.left,
      oy: e.clientY - rect.top,
    };
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

  // PTZ 마우스 클릭 & 누르고 있기(Hold) 인터랙션
  if (ptz) {
    let activeInterval = null;
    let initialTimeout = null;

    function stopHolding() {
      if (initialTimeout) { clearTimeout(initialTimeout); initialTimeout = null; }
      if (activeInterval) { clearInterval(activeInterval); activeInterval = null; }
      ptz.querySelectorAll(".cctv-ptz-btn.is-active").forEach((b) => b.classList.remove("is-active"));
    }

    ptz.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest(".cctv-ptz-btn");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      stopHolding();
      btn.classList.add("is-active");
      const action = btn.dataset.action;
      stepAction(action);

      // 250ms 이상 누르고 있으면 연속 조작
      initialTimeout = setTimeout(() => {
        activeInterval = setInterval(() => {
          stepAction(action);
        }, 70);
      }, 260);
    });

    window.addEventListener("pointerup", stopHolding);
    window.addEventListener("pointercancel", stopHolding);
    ptz.addEventListener("pointerleave", stopHolding);

    // 더블클릭 시 카메라 1.0x 원위치 리셋
    ptz.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      resetCamera();
    });
  }

  // CCTV 패널 리사이즈 (크기 조절)
  const resizeHandles = panel.querySelectorAll(".cctv-resize-edge, .cctv-resize-corner");
  let resizing = null;
  const MIN_W = 420;
  const MIN_H = 290;

  resizeHandles.forEach((handleEl) => {
    handleEl.addEventListener("pointerdown", (e) => {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = panel.getBoundingClientRect();
      resizing = {
        edge: handleEl.dataset.edge,
        startX: e.clientX,
        startY: e.clientY,
        startW: rect.width,
        startH: rect.height,
        startL: rect.left,
        startT: rect.top,
      };

      panel.classList.add("is-resizing");
      try { handleEl.setPointerCapture?.(e.pointerId); } catch (_) {}

      const onPointerMove = (ev) => {
        if (!resizing) return;
        const dx = ev.clientX - resizing.startX;
        const dy = ev.clientY - resizing.startY;
        const maxW = window.innerWidth - resizing.startL - 12;
        const maxH = window.innerHeight - resizing.startT - 12;

        if (resizing.edge === "se") {
          const newW = Math.max(MIN_W, Math.min(maxW, resizing.startW + dx));
          const newH = Math.max(MIN_H, Math.min(maxH, resizing.startH + dy));
          panel.style.width = `${Math.round(newW)}px`;
          panel.style.height = `${Math.round(newH)}px`;
        } else if (resizing.edge === "e") {
          const newW = Math.max(MIN_W, Math.min(maxW, resizing.startW + dx));
          panel.style.width = `${Math.round(newW)}px`;
        } else if (resizing.edge === "s") {
          const newH = Math.max(MIN_H, Math.min(maxH, resizing.startH + dy));
          panel.style.height = `${Math.round(newH)}px`;
        } else if (resizing.edge === "w") {
          const maxShift = resizing.startW - MIN_W;
          const shift = Math.min(maxShift, Math.max(-resizing.startL + 12, dx));
          const newW = resizing.startW - shift;
          const newL = resizing.startL + shift;
          panel.style.width = `${Math.round(newW)}px`;
          panel.style.left = `${Math.round(newL)}px`;
        } else if (resizing.edge === "sw") {
          const maxShift = resizing.startW - MIN_W;
          const shift = Math.min(maxShift, Math.max(-resizing.startL + 12, dx));
          const newW = resizing.startW - shift;
          const newL = resizing.startL + shift;
          const newH = Math.max(MIN_H, Math.min(maxH, resizing.startH + dy));
          panel.style.width = `${Math.round(newW)}px`;
          panel.style.left = `${Math.round(newL)}px`;
          panel.style.height = `${Math.round(newH)}px`;
        }
      };

      const onPointerUp = (ev) => {
        if (!resizing) return;
        panel.classList.remove("is-resizing");
        try { handleEl.releasePointerCapture?.(ev.pointerId); } catch (_) {}
        handleEl.removeEventListener("pointermove", onPointerMove);
        handleEl.removeEventListener("pointerup", onPointerUp);
        handleEl.removeEventListener("pointercancel", onPointerUp);
        resizing = null;
      };

      handleEl.addEventListener("pointermove", onPointerMove);
      handleEl.addEventListener("pointerup", onPointerUp);
      handleEl.addEventListener("pointercancel", onPointerUp);
    });
  });

  window.openCctvModal = openCctv;
})();
