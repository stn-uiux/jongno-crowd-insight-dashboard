/* ==========================================================================
   REALTIME DANGER ZONE ALERT WIDGET (js/alert-widget.js)
   - 01. Alert State Management (Empty / Safe vs. Danger List)
   - 02. Header Click Toggle (Simulation / State Switch)
   - 03. CCTV Modal Trigger (.alert-btn-cctv -> window.openCctvModal)
   - 04. Map Detail Navigation (.alert-btn-arrow -> window.openMapDetail)
   - 05. Global API Exposure
   ========================================================================== */

(function () {
  "use strict";

  const widget = document.querySelector('[data-widget-id="alert-realtime"]');
  if (!widget) return;

  const head = widget.querySelector(".alert-widget-head");

  let isSafeState = widget.classList.contains("is-empty");

  /** 위험 <-> 안전 상태 전환 (위젯 클래스 .is-empty 토글) */
  function setState(safe) {
    isSafeState = !!safe;
    widget.classList.toggle("is-empty", isSafeState);
    widget.classList.toggle("is-safe", isSafeState);
  }

  // 헤더 클릭 시 위험 목록 ⇄ Clear(안전) 상태 테스트 토글
  if (head) {
    head.addEventListener("click", () => {
      setState(!widget.classList.contains("is-empty"));
    });
  }

  // CCTV 버튼 클릭 -> CCTV 모달 오픈
  widget.querySelectorAll(".alert-btn-cctv").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cctvId = btn.dataset.cctv || "D-11";
      if (typeof window.openCctvModal === "function") {
        window.openCctvModal(cctvId);
      }
    });
  });

  // 화살표 버튼 호버 시 카드 전체 올라가는 효과 & 클릭 시 해당 map detail로 이동
  widget.querySelectorAll(".alert-item").forEach((item) => {
    const arrowBtn = item.querySelector(".alert-btn-arrow");
    if (!arrowBtn) return;

    // 호버 시 해당 레이아웃 전체가 위로 살짝 올라가는 효과 보조
    arrowBtn.addEventListener("mouseenter", () => item.classList.add("is-hovered"));
    arrowBtn.addEventListener("mouseleave", () => item.classList.remove("is-hovered"));

    // 화살표 누르면 해당 구역 map detail로 이동
    arrowBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const region = arrowBtn.dataset.region || item.dataset.region || "A";
      if (typeof window.openMapDetail === "function") {
        window.openMapDetail(region);
      }
    });
  });

  // 전역 API 노출
  window.setAlertWidgetState = setState;
  window.toggleAlertWidgetState = () => setState(!isSafeState);
})();
