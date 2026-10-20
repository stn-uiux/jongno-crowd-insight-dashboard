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
})();
