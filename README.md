# 종로구 스마트인파 관리 대시보드 (Jongno Crowd Insight Dashboard)

서울시 종로구 주요 밀집 지역(익선동, 헌법재판소 일대, 낙원동, 광화문 광장 접점 등)의 인구 유동, 체류 인원, 혼잡도 및 재난 안전 상황을 실시간으로 관제·분석할 수 있는 고정밀 반응형 관제 대시보드 시스템입니다.

🔗 **라이브 배포 URL**: [https://jongno-crowd-insight-dashboard.vercel.app](https://jongno-crowd-insight-dashboard.vercel.app)

---

## 🌟 주요 기능

1. **실시간 스마트인파 모니터링 & KPI 지표**
   - 현재 체류인구, 금일 누적방문, 재방문율, 평균 체류시간 실시간 집계
   - 전일 대비 증감 트렌드 배지 제공

2. **구역별 상세 지도 & CCTV 실시간 관제**
   - 4대 핵심 구역(A~D) 인터랙티브 SVG 폴리곤 맵 연동
   - 50개소 CCTV 위치 매핑, 실시간 영상 뷰어 및 도로명 주소 팝업

3. **고정밀 24×20 그리드 대시보드 편집 모드**
   - 위젯 드래그 앤 드롭 이동, 실시간 스왑(맞바꾸기) 및 충돌 감지
   - 마우스 리사이즈(8방향 핸들) 및 최소 3×3 규격 안전 잠금
   - 위젯 추가/삭제, 카탈로그 팝업 내 실시간 공간 부족 감지 및 진동 알림
   - `localStorage` 기반 개인화 레이아웃 영구 저장 및 새로고침 시 깜빡임(FOUC) 방지

4. **실시간 위험 및 재난 안전 알림 위젯**
   - 기상특보/교통/인파 밀집 위험 구역 실시간 배지 알림
   - 긴급재난문자 롤링 배너 및 상세 팝업 모달

5. **정밀 데이터 시각화 (amCharts 5)**
   - 연령대별 체류 비율(도넛 차트, 라벨 지시선 최적화)
   - 시간대별 체류인원 추이 및 전일 대비 혼잡도 비교 (그린민트 테마 적용)
   - 구역별 혼잡 위험도(`danger`, `warning`, `caution`, `watch`) 실시간 트렌드 스파크라인

---

## 🛠 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla ES6+)
- **Visualization**: amCharts 5 (XYChart, PieChart)
- **Design System**: 498개 전용 CSS 디자인 토큰 (Zero Raw Color)
- **Deployment**: Vercel (CI/CD 자동 연동)
