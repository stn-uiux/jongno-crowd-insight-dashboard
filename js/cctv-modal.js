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
  const iconPlay = btnPlay?.querySelector(".icon-play");
  const iconPause = btnPlay?.querySelector(".icon-pause");
  if (!modal || !panel || !handle || !btnClose || !btnPlay) return;

  const META = {
    "A-1": { title: "익선동 입구 CCTV", address: "서울 종로구 익선동 166" },
    "A-2": { title: "익선동 북측 CCTV", address: "서울 종로구 익선동 128" },
    "A-3": { title: "익선동 중앙 CCTV", address: "서울 종로구 익선동 140" },
    "A-4": { title: "익선동 서측 CCTV", address: "서울 종로구 익선동 112" },
    "A-5": { title: "익선동 교차로 CCTV", address: "서울 종로구 익선동 155" },
    "A-6": { title: "익선동 동측 CCTV", address: "서울 종로구 익선동 180" },
    "A-7": { title: "익선동 골목 CCTV", address: "서울 종로구 익선동 98" },
    "A-8": { title: "익선동 남측 CCTV", address: "서울 종로구 익선동 172" },
    "A-9": { title: "익선동 광장 CCTV", address: "서울 종로구 익선동 190" },
    "A-10": { title: "익선동 동남 CCTV", address: "서울 종로구 익선동 201" },
    "A-11": { title: "종로 3가 앞 CCTV", address: "서울 종로구 종로3가 123" },
    "A-12": { title: "익선동 남단 CCTV", address: "서울 종로구 익선동 210" },
    "A-13": { title: "익선동 동단 CCTV", address: "서울 종로구 익선동 220" },
  };

  let playing = false;
  let stampTimer = null;
  let drag = null;
  let activeTipBtn = null;

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
    const id = pointId || "A-11";
    const meta = META[id] || { title: `${id} CCTV`, address: "서울 종로구 익선동" };
    if (zoneEl) zoneEl.textContent = id;
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
    openCctv(point?.dataset.id || "A-11", btn);
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

  window.openCctvModal = openCctv;
})();
