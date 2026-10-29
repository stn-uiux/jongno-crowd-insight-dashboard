(function () {
  const sidebar = document.getElementById("app-sidebar");
  if (!sidebar) return;

  const toggle = sidebar.querySelector(".sidebar-toggle");
  toggle?.addEventListener("click", () => {
    const collapsed = sidebar.classList.toggle("is-collapsed");
    toggle.title = collapsed ? "메뉴 펼치기" : "메뉴 접기";
    toggle.setAttribute("aria-label", toggle.title);
    // 전환 중·종료 후 레이아웃/차트 재측정
    const ping = () => window.dispatchEvent(new Event("resize"));
    ping();
    requestAnimationFrame(() => {
      ping();
      requestAnimationFrame(ping);
    });
    const onEnd = (e) => {
      if (e.target !== sidebar) return;
      if (e.propertyName !== "width" && e.propertyName !== "flex-basis") return;
      ping();
      sidebar.removeEventListener("transitionend", onEnd);
    };
    sidebar.addEventListener("transitionend", onEnd);
  });

  sidebar.querySelectorAll(".menu-item.has-children > .menu-link").forEach((link) => {
    link.addEventListener("click", () => {
      const item = link.parentElement;
      const open = item.classList.toggle("is-open");
      if (open) item.classList.add("child-active");
    });
  });

  sidebar.querySelectorAll(".menu-link[href='#']").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
    });
  });

  // 테마 모드 전환 (다크 / 라이트: data-mode="dark" | "light")
  const themeToggle = sidebar.querySelector(".theme-toggle-btn");
  const THEME_KEY = "jongno-dashboard-theme-mode";

  function applyThemeMode(mode, save = true) {
    const isLight = mode === "light";
    const currentMode = isLight ? "light" : "dark";
    document.documentElement.setAttribute("data-mode", currentMode);
    document.body?.setAttribute("data-mode", currentMode);

    const pageBg = document.querySelector(".page-bg");
    if (pageBg) {
      pageBg.src = isLight ? "assets/light-jongno-dashboard-bg.png" : "assets/dark-jongno-dashboard-bg.png";
    }

    const logoImgs = document.querySelectorAll(".sidebar-logo img, .brand img");
    const logoSrc = isLight ? "assets/light-logo-only.png" : "assets/dark-logo-only.png";
    logoImgs.forEach((img) => {
      img.src = logoSrc;
    });

    if (themeToggle) {
      const icon = themeToggle.querySelector("i");
      if (icon) {
        icon.className = isLight ? "bi bi-moon-fill" : "bi bi-sun-fill";
      }
      themeToggle.title = isLight ? "다크 모드로 전환" : "라이트 모드로 전환";
      themeToggle.setAttribute("aria-label", themeToggle.title);
    }

    if (save) {
      try {
        localStorage.setItem(THEME_KEY, currentMode);
      } catch (_) {}
    }

    // 차트 및 지도 테마 변경 이벤트 전파
    window.dispatchEvent(new CustomEvent("themechange", { detail: { mode: currentMode } }));
  }

  // 저장된 테마 모드 복원 (기본값: dark)
  let initialMode = "dark";
  try {
    initialMode = localStorage.getItem(THEME_KEY) || document.documentElement.getAttribute("data-mode") || "dark";
  } catch (_) {}
  applyThemeMode(initialMode, false);

  themeToggle?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-mode") === "light" ? "light" : "dark";
    applyThemeMode(current === "light" ? "dark" : "light", true);
  });

  // =========================================================================
  // 메뉴 뷰 전환 (대시보드 / 통계 보고서 뷰)
  // - 전체 앱(사이드바·헤더·기간 필터바)은 현재 다크/라이트 테마를 그대로 유지
  // - 통계 뷰 진입 시 내부 보고서 미리보기 영역(.board)만 data-mode="light"로 고정
  // =========================================================================
  const dashboardMenuItem = document.getElementById("menu-item-dashboard");
  const equipmentMenuItem = document.getElementById("menu-item-equipment");
  const statsMenuItem = document.getElementById("menu-item-stats");
  const btnEdit = document.getElementById("btn-edit");
  const statsFilterBar = document.getElementById("stats-filter-bar");
  const boardEl = document.querySelector(".board");

  function clearMenuActive() {
    [dashboardMenuItem, equipmentMenuItem, statsMenuItem].forEach((item) => {
      if (!item) return;
      item.classList.remove("child-active");
      item.querySelectorAll(".menu-link, .submenu-link").forEach((el) => {
        el.classList.remove("active");
      });
    });
  }

  function pingLayoutResize() {
    const fire = () => window.dispatchEvent(new Event("resize"));
    fire();
    requestAnimationFrame(() => {
      fire();
      requestAnimationFrame(fire);
    });
    setTimeout(fire, 120);
  }

  function getActiveStatsDays() {
    const activeBtn = statsFilterBar?.querySelector(".stats-range-btn.is-active");
    if (activeBtn) {
      return parseInt(activeBtn.getAttribute("data-days") || "30", 10);
    }
    const startInput = document.getElementById("stats-date-start");
    const endInput = document.getElementById("stats-date-end");
    if (startInput?.value && endInput?.value) {
      const diff = Math.round((new Date(endInput.value) - new Date(startInput.value)) / 86400000) + 1;
      if (diff <= 10) return 7;
      if (diff >= 60) return 90;
    }
    return 30;
  }

  function getStatsCompareLabel(days) {
    if (days === 7) return "저번주 대비";
    if (days === 90) return "지난 분기 대비";
    return "지난달 대비";
  }

  function getStatsAccumTitle(days) {
    if (days === 7) return "이번주 누적 방문 인원";
    if (days === 90) return "이번분기 누적 방문 인원";
    return "이번달 누적 방문 인원";
  }

  function getStatsCompareWidgetMeta(days) {
    if (days === 7) {
      return { title: "주간 방문인원 & 혼잡도 비교", past: "지난주", curr: "이번주" };
    }
    if (days === 90) {
      return { title: "분기별 방문인원 & 혼잡도 비교", past: "지난분기", curr: "이번분기" };
    }
    return { title: "월간 방문인원 & 혼잡도 비교", past: "지난달", curr: "이번달" };
  }

  function syncStatsKpiPeriodLabels(isStats, daysOverride) {
    const days = daysOverride || getActiveStatsDays();
    const compareText = getStatsCompareLabel(days);
    const accumTitleText = getStatsAccumTitle(days);
    const compareMeta = getStatsCompareWidgetMeta(days);

    // 1) 현재 체류 인원 -> 통계에서 '총 방문인원'으로 변경
    const currentStayTitle = document.querySelector('[data-widget-id="kpi-current-stay"] .widget-title');
    if (currentStayTitle) {
      if (isStats) {
        if (!currentStayTitle.dataset.dashTitle) currentStayTitle.dataset.dashTitle = currentStayTitle.textContent;
        currentStayTitle.textContent = "총 방문인원";
      } else if (currentStayTitle.dataset.dashTitle) {
        currentStayTitle.textContent = currentStayTitle.dataset.dashTitle;
        delete currentStayTitle.dataset.dashTitle;
      }
    }

    // 2) 오늘 누적 방문 인원 -> 통계에서 7일: '이번주 누적 방문 인원', 30일: '이번달 누적 방문 인원', 90일: '이번분기 누적 방문 인원'
    // 2) 누적 방문 인원 카드 타이틀 (7일: 이번주 / 30일: 이번달 / 90일: 이번분기)
    ["kpi-today-visit", "kpi-month-visit"].forEach((id) => {
      const visitTitle = document.querySelector(`[data-widget-id="${id}"] .widget-title`);
      if (visitTitle) {
        if (isStats) {
          if (!visitTitle.dataset.dashTitle) visitTitle.dataset.dashTitle = visitTitle.textContent;
          visitTitle.textContent = accumTitleText;
        } else if (visitTitle.dataset.dashTitle) {
          visitTitle.textContent = visitTitle.dataset.dashTitle;
          delete visitTitle.dataset.dashTitle;
        }
      }
    });

    // 3) KPI 하단 대비 배지 문구 연동 (7일: 저번주 대비 / 30일: 지난달 대비 / 90일: 지난 분기 대비)
    ["kpi-current-stay", "kpi-today-visit", "kpi-month-visit", "kpi-revisit", "kpi-avg-stay"].forEach((id) => {
      const widget = document.querySelector(`[data-widget-id="${id}"]`);
      if (!widget) return;
      const badgeSpan = widget.querySelector(".badge span");
      if (badgeSpan) {
        if (isStats) {
          if (!badgeSpan.dataset.dashText) badgeSpan.dataset.dashText = badgeSpan.textContent;
          badgeSpan.textContent = compareText;
        } else if (badgeSpan.dataset.dashText) {
          badgeSpan.textContent = badgeSpan.dataset.dashText;
          delete badgeSpan.dataset.dashText;
        }
      }
    });

    // 4) 방문인원 & 혼잡도 비교 차트 (7일: 주간·지난주·이번주 / 30일: 월간·지난달·이번달 / 90일: 분기별·지난분기·이번분기)
    const compareWidget = document.querySelector('[data-widget-id="chart-compare"]');
    if (compareWidget) {
      const compareTitle = compareWidget.querySelector(".widget-title");
      if (compareTitle) {
        if (isStats) {
          if (!compareTitle.dataset.dashTitle) compareTitle.dataset.dashTitle = compareTitle.textContent;
          compareTitle.textContent = compareMeta.title;
        } else if (compareTitle.dataset.dashTitle) {
          compareTitle.textContent = compareTitle.dataset.dashTitle;
          delete compareTitle.dataset.dashTitle;
        }
      }

      const legendRows = compareWidget.querySelectorAll(".compare-legend > div");
      if (legendRows.length >= 2) {
        const firstLabel = legendRows[0].querySelector("span:first-child");
        const firstKeys = legendRows[0].querySelector(".keys");
        const secondKeys = legendRows[1].querySelector(".keys");

        if (isStats) {
          if (firstLabel) firstLabel.innerHTML = '방문인원 <em>(단위: 명)</em>';
          if (firstKeys) firstKeys.innerHTML = `<i class="sq pale-blue"></i>${compareMeta.past} <i class="sq deep-blue"></i>${compareMeta.curr}`;
          if (secondKeys) secondKeys.innerHTML = `<i class="sq pale-green"></i>${compareMeta.past} <i class="sq deep-green"></i>${compareMeta.curr}`;
        } else {
          if (firstLabel) firstLabel.innerHTML = '체류인원 <em>(단위: 명)</em>';
          if (firstKeys) firstKeys.innerHTML = '<i class="sq pale-blue"></i>어제 <i class="sq deep-blue"></i>오늘';
          if (secondKeys) secondKeys.innerHTML = '<i class="sq pale-green"></i>어제 <i class="sq deep-green"></i>오늘';
        }
      }
    }
  }

  function syncStatsWidgetLabels(isStats) {
    syncStatsKpiPeriodLabels(isStats);

    const pieTitle = document.querySelector('[data-widget-id="chart-pie"] .widget-title');
    if (pieTitle) {
      if (isStats) {
        if (!pieTitle.dataset.dashTitle) pieTitle.dataset.dashTitle = pieTitle.textContent;
        pieTitle.textContent = "구역별 총 체류인원 분포";
      } else if (pieTitle.dataset.dashTitle) {
        pieTitle.textContent = pieTitle.dataset.dashTitle;
        delete pieTitle.dataset.dashTitle;
      }
    }

    const stayTitle = document.querySelector('[data-widget-id="chart-stay"] .widget-title');
    if (stayTitle) {
      if (isStats) {
        if (!stayTitle.dataset.dashTitle) stayTitle.dataset.dashTitle = stayTitle.textContent;
        stayTitle.textContent = "구역별 체류 인원 & 혼잡도";
      } else if (stayTitle.dataset.dashTitle) {
        stayTitle.textContent = stayTitle.dataset.dashTitle;
        delete stayTitle.dataset.dashTitle;
      }
    }
  }

  function setViewMode(view) {
    const isStats = view === "stats";

    if (isStats) {
      // 편집 모드가 열려 있다면 먼저 취소하여 종료 (#stage.is-editing 해제)
      const stageEl = document.getElementById("stage");
      if (stageEl?.classList.contains("is-editing") || document.body.classList.contains("is-editing")) {
        document.getElementById("btn-cancel-edit")?.click();
        stageEl?.classList.remove("is-editing");
      }

      document.documentElement.classList.add("is-stats-view");
      document.body.classList.add("is-stats-view");
      syncStatsWidgetLabels(true);

      // 통계 뷰 진입 시 대시보드 편집 모드의 인라인 grid-column/grid-row 일시 보관 후 해제
      boardEl?.querySelectorAll(".widget[data-widget-id]").forEach((el) => {
        if (el.style.gridColumn) el.dataset.dashGridCol = el.style.gridColumn;
        if (el.style.gridRow) el.dataset.dashGridRow = el.style.gridRow;
        el.style.removeProperty("grid-column");
        el.style.removeProperty("grid-row");
      });

      // 대시보드 현재 테마(다크/라이트) 그대로 상속하도록 개별 data-mode 해제
      boardEl?.removeAttribute("data-mode");

      clearMenuActive();
      statsMenuItem?.querySelector(".menu-link")?.classList.add("active");

      if (btnEdit) btnEdit.hidden = true;
      if (statsFilterBar) statsFilterBar.hidden = false;

      if (boardEl) boardEl.scrollTop = 0;

      const currentAppMode = document.documentElement.getAttribute("data-mode") || "dark";
      window.dispatchEvent(new CustomEvent("themechange", { detail: { mode: currentAppMode } }));
      pingLayoutResize();
    } else {
      document.documentElement.classList.remove("is-stats-view");
      document.body.classList.remove("is-stats-view");
      syncStatsWidgetLabels(false);

      // 대시보드 복귀 시 보관해둔 인라인 grid-column/grid-row 복원
      boardEl?.querySelectorAll(".widget[data-widget-id]").forEach((el) => {
        if (el.dataset.dashGridCol) {
          el.style.gridColumn = el.dataset.dashGridCol;
          delete el.dataset.dashGridCol;
        }
        if (el.dataset.dashGridRow) {
          el.style.gridRow = el.dataset.dashGridRow;
          delete el.dataset.dashGridRow;
        }
      });

      // 대시보드 복귀 시 .board의 개별 data-mode 해제 (상위 테마 상속)
      boardEl?.removeAttribute("data-mode");

      clearMenuActive();
      if (dashboardMenuItem) {
        dashboardMenuItem.classList.add("child-active", "is-open");
        dashboardMenuItem.querySelector(":scope > .menu-link")?.classList.add("active");
        dashboardMenuItem.querySelector(".submenu-link")?.classList.add("active");
      }

      if (btnEdit) btnEdit.hidden = false;
      if (statsFilterBar) statsFilterBar.hidden = true;

      const currentAppMode = document.documentElement.getAttribute("data-mode") || "dark";
      window.dispatchEvent(new CustomEvent("themechange", { detail: { mode: currentAppMode } }));
      pingLayoutResize();
    }
  }

  // =========================================================================
  // 통계 상단 기간 설정 바 (7일 / 30일 / 90일 빠른 선택, 날짜 입력, 조회 버튼)
  // =========================================================================
  if (statsFilterBar) {
    const rangeBtns = statsFilterBar.querySelectorAll(".stats-range-btn");
    const startInput = document.getElementById("stats-date-start");
    const endInput = document.getElementById("stats-date-end");
    const queryBtn = document.getElementById("btn-stats-query");

    function formatDate(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }

    rangeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const days = parseInt(btn.getAttribute("data-days") || "30", 10);
        rangeBtns.forEach((b) => b.classList.toggle("is-active", b === btn));

        if (startInput && endInput) {
          const endDate = endInput.value ? new Date(endInput.value) : new Date(2026, 9, 3);
          const startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - (days - 1));
          startInput.value = formatDate(startDate);
          endInput.value = formatDate(endDate);
        }
        if (document.body.classList.contains("is-stats-view")) {
          syncStatsKpiPeriodLabels(true, days);
          const currentAppMode = document.documentElement.getAttribute("data-mode") || "dark";
          window.dispatchEvent(new CustomEvent("themechange", { detail: { mode: currentAppMode } }));
        }
      });
    });

    [startInput, endInput].forEach((input) => {
      if (!input) return;
      input.addEventListener("change", () => {
        rangeBtns.forEach((b) => b.classList.remove("is-active"));
        if (document.body.classList.contains("is-stats-view")) {
          syncStatsKpiPeriodLabels(true);
          const currentAppMode = document.documentElement.getAttribute("data-mode") || "dark";
          window.dispatchEvent(new CustomEvent("themechange", { detail: { mode: currentAppMode } }));
        }
      });
      const field = input.closest(".stats-date-field");
      field?.addEventListener("click", (e) => {
        if (e.target !== input && typeof input.showPicker === "function") {
          try {
            input.showPicker();
          } catch (_) {}
        }
      });
    });

    queryBtn?.addEventListener("click", () => {
      if (document.body.classList.contains("is-stats-view")) {
        syncStatsKpiPeriodLabels(true);
      }
      const currentAppMode = document.documentElement.getAttribute("data-mode") || "dark";
      window.dispatchEvent(new CustomEvent("themechange", { detail: { mode: currentAppMode } }));
      pingLayoutResize();
    });

    function buildReportPrintUrl(autoAction) {
      const s = startInput?.value || "2026-09-04";
      const e = endInput?.value || "2026-10-03";
      const days = String(getActiveStatsDays());
      const q = new URLSearchParams({ start: s, end: e, days });
      if (autoAction) q.set("auto", autoAction);
      return `./report_print.html?${q.toString()}`;
    }

    const pdfBtn = document.getElementById("btn-report-pdf");
    pdfBtn?.addEventListener("click", () => {
      if (pdfBtn.disabled) return;
      const labelSpan = pdfBtn.querySelector("span");
      const prevLabel = labelSpan ? labelSpan.textContent : "PDF로 다운로드";
      pdfBtn.disabled = true;
      if (labelSpan) labelSpan.textContent = "PDF 다운로드 중...";

      const prevFrame = document.getElementById("report-pdf-hidden-frame");
      if (prevFrame) prevFrame.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "report-pdf-hidden-frame";
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.cssText =
        "position:fixed;left:-9999px;top:0;width:1200px;height:900px;opacity:0;pointer-events:none;border:0;";

      const cleanup = () => {
        window.removeEventListener("message", onMsg);
        clearTimeout(fallbackTimer);
        pdfBtn.disabled = false;
        if (labelSpan) labelSpan.textContent = prevLabel;
        setTimeout(() => {
          iframe.remove();
        }, 500);
      };

      const onMsg = (e) => {
        if (e.data && e.data.type === "report-pdf-done") {
          cleanup();
        }
      };

      window.addEventListener("message", onMsg);
      const fallbackTimer = setTimeout(cleanup, 15000);
      iframe.src = buildReportPrintUrl("pdf");
      document.body.appendChild(iframe);
    });

    const printBtn = document.getElementById("btn-report-print");
    printBtn?.addEventListener("click", () => {
      window.open(buildReportPrintUrl(), "_blank", "noopener");
    });
  }

  // 사이드바 네비게이션 클릭 바인딩
  sidebar.querySelectorAll("[data-nav-view]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const targetView = el.getAttribute("data-nav-view");
      if (targetView === "stats") {
        e.preventDefault();
        setViewMode("stats");
      } else if (targetView === "dashboard") {
        e.preventDefault();
        setViewMode("dashboard");
      }
    });
  });

  // 좌측 상단 로고 클릭 시에도 대시보드 기본 뷰로 복귀
  const logoLink = sidebar.querySelector(".sidebar-logo a");
  logoLink?.addEventListener("click", (e) => {
    if (document.body.classList.contains("is-stats-view")) {
      e.preventDefault();
      setViewMode("dashboard");
    }
  });

  // URL 해시가 #statistics 인 상태로 진입 시 통계 뷰 자동 활성화
  if (window.location.hash === "#statistics") {
    setViewMode("stats");
  }
})();
