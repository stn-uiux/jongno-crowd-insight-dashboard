(function () {
  "use strict";

  const DISASTER_ALERTS_DATA = {
    "disaster-1": {
      id: "disaster-1",
      type: "critical",
      category: "긴급",
      title: "재난문자",
      headline: "종로구 지역에 강풍주의보가 발효되었습니다.",
      date: "10.03 16:54",
      fullDate: "2026.10.03 16:54",
      sender: "기상청 / 종로구청 재난안전대책본부",
      targetArea: "서울특별시 종로구 전역",
      icon: "bi-megaphone-fill",
      content: `[기상청 속보] 오늘 16시 50분 기준 종로구 및 서울 전역에 강풍주의보가 발효되었습니다. 순간풍속 20m/s(70km/h) 이상의 강한 바람이 예상되오니 야외 설치물 점검 및 낙하물에 각별히 유의하시기 바랍니다.

■ 주요 시민 행동 요령
• 간판, 현수막, 베란다 화분 등 비산 위험물 결속 및 철거
• 노후 건축물 및 공사장 주변 보행 시 낙하물 주의
• 비닐하우스 등 농업·임시 시설물 사전 점검 철저
• 보행 시 파손된 가로수 및 전선 등 감전 위험물 접근 금지

■ 긴급 연락처
• 종로구 재난안전상황실: 02-2148-1119
• 응급 구조 및 화재 신고: 119`,
    },
    "disaster-2": {
      id: "disaster-2",
      type: "weather",
      category: "기상",
      title: "기상특보",
      headline: "오늘 밤부터 많은 비가 예상되니 안전에 유의하세요.",
      date: "10.03 14:20",
      fullDate: "2026.10.03 14:20",
      sender: "수도권기상청 / 종로구 치수과",
      targetArea: "종로구 및 청계천·북촌 일대",
      icon: "bi-cloud-rain-heavy-fill",
      content: `[호우 예보] 서해상에서 유입되는 발달한 저기압의 영향으로 오늘 밤(21:00)부터 내일 새벽 사이 종로구 일대에 시간당 30~50mm의 강한 비가 집중될 것으로 예상됩니다.

■ 침수 및 안전 대비 안내
• 청계천 산책로 및 하천변 보행로 출입 일시 통제 예정
• 저지대 및 반지하 주택 차수판·역류방지밸브 사전 점검
• 빗물받이 위 덮개 및 쓰레기 제거로 배수 흐름 확보
• 지하차도 및 침수 우려 도로 우회 운행 권장

■ 통제 안내
• 청계천 산책로 진입차단기 작동 준비 중 (수위 상승 시 즉시 차단)`,
    },
    "disaster-3": {
      id: "disaster-3",
      type: "traffic",
      category: "교통",
      title: "도로 통제",
      headline: "세종대로 일부 구간이 통제 중입니다.",
      date: "10.03 11:18",
      fullDate: "2026.10.03 11:18",
      sender: "서울경찰청 / 종로구 교통행정과",
      targetArea: "세종대로 (광화문삼거리 ~ 세종대로사거리)",
      icon: "bi-car-front-fill",
      content: `[교통 통제 안내] 주말 종로 보행전용거리 행사 및 시설물 안전 점검 작업으로 인해 세종대로 일부 차로의 차량 통행이 통제되고 있습니다.

■ 통제 상세 내역
• 통제 구간: 세종대로 사거리 ~ 광화문 삼거리 (양방향 하위 2개 차로)
• 통제 일시: 2026.10.03 10:00 ~ 18:00
• 통제 사유: 보행자 안전 펜스 보강 및 공공시설 정비 작업

■ 우회 및 교통 안내
• 자하문로, 율곡로, 우정국로 방면으로 우회 운행 요망
• 광화문역(5호선), 종각역(1호선), 경복궁역(3호선) 대중교통 이용 권장
• 실시간 교통정보: TOPIS(서울교통정보) 또는 120 다산콜센터`,
    },
    "disaster-4": {
      id: "disaster-4",
      type: "living",
      category: "생활안전",
      title: "상수도 점검 안내",
      headline: "종로구 일부 지역에서 단수 작업이 진행됩니다.",
      date: "10.03 09:32",
      fullDate: "2026.10.03 09:32",
      sender: "서울아리수본부 중부수도사업소",
      targetArea: "가회동, 재동, 삼청동 일부 지역",
      icon: "bi-droplet-half",
      content: `[상수도 긴급 정비 안내] 율곡로 일대 노후 상수도 관로 누수 복구 및 세척 공사로 인하여 해당 지역의 수돗물 공급이 일시 중단됩니다.

■ 단수 상세 정보
• 단수 지역: 종로구 가회동, 재동, 삼청동 일원 약 850세대
• 단수 일시: 2026.10.03 09:30 ~ 14:00 (약 4시간 30분)
• 작업 내용: 관경 300mm 노후 밸브 교체 및 배수관 세척

■ 주민 협조 사항
• 단수 전 사용할 생활용수를 충분히 확보해 주시기 바랍니다.
• 단수 해제 직후 일시적으로 녹물 또는 흐린 물이 나올 수 있으니 잠시 방류 후 사용하십시오.
• 비상 급수 지원: 주민센터 앞 비상 급수차(2대) 배치 완료`,
    },
    "disaster-5": {
      id: "disaster-5",
      type: "event",
      category: "행사안전",
      title: "행사 안전 안내",
      headline: "주말 행사로 인파가 증가할 수 있으니 안전에 유의하세요.",
      date: "10.02 17:10",
      fullDate: "2026.10.02 17:10",
      sender: "종로구청 문화안전과 / 혜화경찰서",
      targetArea: "인사동 쌈지길 및 익선동 한옥거리 일대",
      icon: "bi-people-fill",
      content: `[축제 인파 밀집 주의 안내] 주말 ‘2026 종로 가을 전통문화 축제’ 개최로 인사동 및 익선동 일대에 많은 관람객이 집중될 것으로 예상됩니다.

■ 행사 개요 및 예상 혼잡
• 행사 일시: 2026.10.03(토) ~ 10.04(일) 12:00 ~ 21:00
• 최대 혼잡 예상: 16:00 ~ 19:00 (순간 인원 약 5만 명)
• 주요 혼잡 구간: 인사동 쌈지길 진입로, 돈화문로 골목길

■ 안전관리 대책
• 골목길 일방통행 유도 및 안전관리 요원 65명 현장 배치
• 인파 밀집도 4단계(경계) 진입 시 진입로 일시 통제 실시
• 미아 보호소 및 응급 의료 부스: 안국역 6번 출구 앞 운영
• 관람객께서는 안내요원의 유도에 적극 협조해 주시기 바랍니다.`,
    },
  };

  const widget = document.querySelector('[data-widget-id="alert-disaster"]');
  const modal = document.getElementById("disaster-modal");
  const backdrop = document.getElementById("disaster-modal-backdrop");
  const panel = modal ? modal.querySelector(".disaster-modal-panel") : null;
  const btnClose = document.getElementById("disaster-modal-close");
  const btnConfirm = document.getElementById("disaster-modal-confirm");

  const badgeEl = document.getElementById("modal-disaster-badge");
  const titleEl = document.getElementById("disaster-modal-title");
  const headlineEl = document.getElementById("modal-disaster-headline");
  const timeEl = document.getElementById("modal-disaster-time");
  const senderEl = document.getElementById("modal-disaster-sender");
  const areaEl = document.getElementById("modal-disaster-area");
  const contentEl = document.getElementById("modal-disaster-content");

  function openModal(alertId) {
    if (!modal) return;
    const data = DISASTER_ALERTS_DATA[alertId] || DISASTER_ALERTS_DATA["disaster-1"];

    if (badgeEl) {
      badgeEl.textContent = data.category;
      badgeEl.className = `disaster-badge is-${data.type}`;
    }
    if (titleEl) {
      titleEl.textContent = `${data.title} 상세`;
    }
    if (headlineEl) {
      headlineEl.textContent = data.headline;
    }
    if (timeEl) {
      timeEl.textContent = data.fullDate;
    }
    if (senderEl) {
      senderEl.textContent = data.sender;
    }
    if (areaEl) {
      areaEl.textContent = data.targetArea;
    }
    if (contentEl) {
      contentEl.textContent = data.content;
    }

    if (panel) {
      panel.classList.toggle("is-critical", data.type === "critical");
    }

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  // 위젯 내 아이템 및 화살표 버튼 이벤트 바인딩
  if (widget) {
    widget.querySelectorAll(".disaster-item").forEach((item) => {
      const id = item.dataset.id;
      const arrowBtn = item.querySelector(".disaster-item-arrow");

      // 화살표 버튼 클릭
      if (arrowBtn) {
        arrowBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openModal(id);
        });
      }

      // 카드 전체 클릭
      item.addEventListener("click", (e) => {
        e.preventDefault();
        openModal(id);
      });

      // 키보드 접근성 (Enter / Space)
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(id);
        }
      });
    });
  }

  // 모달 닫기 이벤트 바인딩 (X 버튼, 확인 버튼, 배경 dim 클릭, ESC 키)
  if (btnClose) btnClose.addEventListener("click", closeModal);
  if (btnConfirm) btnConfirm.addEventListener("click", closeModal);
  if (backdrop) backdrop.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) {
      closeModal();
    }
  });

  // 전역 API 노출
  window.openDisasterModal = openModal;
  window.closeDisasterModal = closeModal;
})();
