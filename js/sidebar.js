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
})();
