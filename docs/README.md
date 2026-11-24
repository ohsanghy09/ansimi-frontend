# 안심이 개발 문서

2026-11-24 기준. 새 작업을 시작할 때 현재 동작, 관련 코드, 검증 기록을 이 문서에서 확인한다. 프론트 기능 변경 기준은 `develop`의 [`29232c9`](https://github.com/shinhan-ansimi/ansimi-frontend/commit/29232c90cbb7df03def229017cadddc0a6784d0e)이며, 백엔드 일반 도보 안내와 기존 요청 호환 처리는 [`2aa1f85`](https://github.com/shinhan-ansimi/ansimi-backend/commit/2aa1f853b2012124e86f3938894c2eb3c85144c9)까지 반영됐다.

## 현재 사용자 흐름

1. **출발지·도착지 설정**. 주소 또는 장소를 검색하거나 지도를 움직여 중앙 핀으로 선택한다. 주소·장소 검색은 먼저 온 결과부터 표시하고 정확히 일치하는 결과를 우선한다. 검색 결과를 선택하면 장소명과 주소를 바로 확인해 확정할 수 있다. 핀을 옮기면 새 주소를 조회한다. 현재 위치를 출발지로 사용할 수 있고, 확정 위치에는 색이 다른 ‘출발’·‘도착’ 라벨이 표시된다. [메인 화면](../src/pages/MainPage.tsx) · [주소·장소 검색](../src/hooks/useLocationSearch.ts) · [카카오맵](../src/components/KaKaoMap.tsx)
2. **경로 찾기**. 양쪽 위치를 확정하면 추천 경로를 요청한다. 두 위치가 강남구 시범 권역 안이면 평가된 구간에 위험도 색을 적용한다. 어느 한쪽이 권역 밖이면 일반 도보 경로를 회색으로 표시하고 ‘위험도 평가 데이터 없음’을 안내한다. 전체 도보 경로는 회색 선으로 깔고 평가된 구간만 위험도 색으로 덧그린다. 지도 아래에는 경로 요약과 ‘귀가 시작’을 주변 시설보다 먼저 배치한다. [응답 처리](../src/lib/routes.ts) · [백엔드 경로 서비스](https://github.com/shinhan-ansimi/ansimi-backend/blob/develop/src/main/java/com/ansimi/route/RouteService.java)
3. **경로 주변 시설**. 카카오 장소 검색에서 편의점(`CS2`), 병원(`HP8`), 약국(`PM9`)을 찾는다. 전체 도보 경로를 우선 사용하고, 전체 경로가 없으면 평가 구간을 기준으로 계산한다. 경로 선까지의 최단 거리가 100m 이내인 시설만 남기고 장소 ID로 중복을 제거한다. 지도와 목록에는 같은 아이콘·유형 필터를 적용하며, 각 유형 안에서 경로에 가까운 순으로 정렬한다. 이 거리는 경로 선까지의 거리다. [시설 조회](../src/lib/facilities.ts) · [조회 상태](../src/hooks/useRouteFacilities.ts) · [시설 아이콘](../src/assets/icons/route-facilities/)
4. **시설 상세**. 시설 카드는 화면에 맞춰 260~360px 높이로 유지한다. 목록에서 선택하면 같은 카드에서 상세를 열고, 목록으로 돌아가면 필터와 스크롤 위치가 복원된다. 지도 마커를 누르면 시설 이름·종류·주소·경로까지의 거리를 담은 상세 창이 바로 열리고 포커스가 이동한다. 경로가 바뀌면 이전 시설 검색 결과를 폐기한다. [시설 카드와 마커](../src/components/FacilityDetails.tsx)
5. **귀가 안내**. 위치 권한이 허용되면 GPS로 현재 구간과 다음 안내 지점까지의 거리를 계산한다. 다음 행동은 지도 위에 표시한다. 위치 정확도가 낮거나 갱신이 끊기면 판단을 보류한다. 연속된 위치 갱신에서 이탈을 감지하면 현재 위치를 출발지로 재탐색하고, 도착하거나 안내를 종료하면 위치 추적과 진행 중 요청을 해제한다. [귀가 안내 화면](../src/components/HomeGuide.tsx) · [위치 감시](../src/hooks/useCurrentPosition.ts) · [구간 계산](../src/lib/navigation.ts)
6. **PWA와 복원**. 배포 빌드에는 설치용 매니페스트, 아이콘, 서비스 워커가 있다. 저장된 귀가 안내는 새로고침 후 사용자가 ‘이어가기’를 선택하면 복원된다. 마지막 저장 시각부터 2시간이 지나거나 안내를 종료·완료하면 저장 상태를 정리한다. 앱이 숨겨지면 위치 감시를 중단하고 복귀하면 새 위치를 받는다. 지도와 경로 조회에는 네트워크가 필요하다. [매니페스트](../public/manifest.webmanifest) · [서비스 워커](../public/sw.js) · [상태 저장](../src/lib/guideStorage.ts)

메인 화면 상단 문구는 ‘당신의 일상에 안심을’과 두 줄 제목 ‘오늘의 귀갓길, / 어디로 향하시나요?’다. [문구 복원 커밋](https://github.com/shinhan-ansimi/ansimi-frontend/commit/f5e118c)

## 프론트와 백엔드 연결

- 공개 화면은 [Vercel](https://ansimi-frontend.vercel.app/), 백엔드는 [Railway Swagger](https://ansimi-backend-production.up.railway.app/swagger-ui/index.html)에서 확인한다. 로컬 출처 `http://localhost:5173`와 Vercel 출처의 CORS 설정 및 서비스 권역 응답은 이전 연동 단계에서 확인했다.
- `GET /api/service-area`는 강남구 시범 권역을 GeoJSON `Feature`의 `MultiPolygon`으로 반환한다. 프론트에서는 경계선과 옅은 음영을 그린다. `GET /api/health`는 서버 상태를 반환한다.
- `POST /api/routes/recommend`에 `origin`과 `destination`을 보낸다. 각 위치의 `coord`는 필수 `[경도, 위도]`이고 `name`은 선택이다. 현재 프론트는 확정 위치의 주소를 `name`으로 보내고 `allowUnassessed: true`를 함께 전달한다. 출발지·도착지의 직선거리 제한은 50m~5km다. [요청과 응답 처리](../src/lib/routes.ts) · [OpenAPI JSON](https://ansimi-backend-production.up.railway.app/v3/api-docs)
- `recommendedIndex`와 `index`가 일치하는 후보를 사용한다. 후보에는 거리(`distanceM`), 예상 시간(`durationMin`), 위험 점수·등급·고위험 구간 길이(`riskScore`, `riskLevel`, `redLengthM`)가 있다. `segments`는 GeoJSON `FeatureCollection`이며 각 구간은 `MultiLineString`과 `level`·`lengthM`을 가진다. `GREEN`, `YELLOW`, `RED`는 각각 위험도 낮음, 보통, 높음을 뜻한다. [위험도 구간 생성 코드](https://github.com/shinhan-ansimi/ansimi-backend/blob/develop/src/main/java/com/ansimi/risk/RiskScoringService.java)
- `navigation.path`는 출발에서 도착까지 순서가 있는 `[경도, 위도]` 배열이고, `navigation.steps`의 각 항목은 `pathIndex`와 `instruction`을 가진다. 권역 밖 일반 경로는 `modelVersion: "walking"`이며 위험도 값과 구간이 비어 있다. 기존 요청이 `allowUnassessed`를 생략하면 권역 밖에서 `422 OUT_OF_AREA`를 받는다. 카카오맵에 좌표를 넣을 때는 `new maps.LatLng(lat, lng)`처럼 순서를 바꾼다. [백엔드 안내 DTO](https://github.com/shinhan-ansimi/ansimi-backend/blob/develop/src/main/java/com/ansimi/route/dto/NavigationDto.java) · [프론트 위치 타입](../src/types/location.ts)

## 위험도 데이터와 표시 범위

AI 파이프라인은 CCTV·보안등·비상벨·경찰시설, 야간 인구, 범죄율 지표 등을 집계해 위험 격자를 생성한다. 백엔드는 격자를 PostGIS에 적재하고 Tmap 도보 경로와 겹치는 부분을 계산해 평가 구간을 반환한다. 현재 추천 응답은 위험도 수치와 구간을 제공한다. ‘조명이 부족해서 위험하다’처럼 특정 구간의 평가 이유를 표시하려면 원인이나 지표 기여도를 응답에 추가해야 한다. AI의 좌표별 `/score`도 격자 안전 점수와 안심길 포함 여부 등을 반환하며 요인별 기여도는 응답에 없다. [AI 점수 산정](https://github.com/shinhan-ansimi/ansimi-ai/blob/develop/data_pipeline/scoring.py) · [AI 점수 API](https://github.com/shinhan-ansimi/ansimi-ai/blob/develop/fastapi_app/main.py) · [격자 적재](https://github.com/shinhan-ansimi/ansimi-backend/blob/develop/src/main/java/com/ansimi/riskimport/RiskGridImportService.java)

화면의 ‘경로 주변 시설’은 카카오 장소 검색의 일반 시설이다. 공식 지정 안심시설, 원본 범죄주의구간, 경로 밖 위험 격자를 별도로 표시하려면 각 데이터를 조회할 수 있는 출처와 범위를 정해야 한다. [카카오 장소 카테고리 검색](https://apis.map.kakao.com/web/documentation/#services_Places_categorySearch)

## 작업 기록

아래 이슈는 완료로 닫혔고 관련 PR은 `develop`에 머지됐다. 이후 직접 반영된 개선은 커밋 링크에서 확인한다.

| 작업 | 이슈·PR 또는 커밋 |
| --- | --- |
| 메인 위치 카드, 카카오맵, 주소 검색·지도 선택 | [#1](https://github.com/shinhan-ansimi/ansimi-frontend/issues/1) · [#2](https://github.com/shinhan-ansimi/ansimi-frontend/issues/2) · [#4](https://github.com/shinhan-ansimi/ansimi-frontend/issues/4) · [#6](https://github.com/shinhan-ansimi/ansimi-frontend/issues/6) · [PR #7](https://github.com/shinhan-ansimi/ansimi-frontend/pull/7) · [#6 작업 기록](./work/issue-6-location-selection.md) |
| 시범 권역과 위험도별 추천 경로 | [#8](https://github.com/shinhan-ansimi/ansimi-frontend/issues/8) · [PR #13](https://github.com/shinhan-ansimi/ansimi-frontend/pull/13) |
| 현재 위치와 귀가 안내, 구간 판단·재탐색·도착 | [#9](https://github.com/shinhan-ansimi/ansimi-frontend/issues/9) · [PR #14](https://github.com/shinhan-ansimi/ansimi-frontend/pull/14) · [#10](https://github.com/shinhan-ansimi/ansimi-frontend/issues/10) · [PR #15](https://github.com/shinhan-ansimi/ansimi-frontend/pull/15) |
| 예시 안전시설과 실제 경로 주변 시설 | [#11](https://github.com/shinhan-ansimi/ansimi-frontend/issues/11) · [PR #17](https://github.com/shinhan-ansimi/ansimi-frontend/pull/17) · [#18](https://github.com/shinhan-ansimi/ansimi-frontend/issues/18) · [PR #19](https://github.com/shinhan-ansimi/ansimi-frontend/pull/19) |
| PWA 설치 설정과 귀가 안내 복원 | [#12](https://github.com/shinhan-ansimi/ansimi-frontend/issues/12) · [PR #16](https://github.com/shinhan-ansimi/ansimi-frontend/pull/16) |
| 시설 아이콘·필터·목록 스크롤 | [`bc8bf49`](https://github.com/shinhan-ansimi/ansimi-frontend/commit/bc8bf49) · [`2d35dfd`](https://github.com/shinhan-ansimi/ansimi-frontend/commit/2d35dfd) |
| 권역 밖 일반 도보 안내와 기존 API 호출 호환 | [프론트 `f97956d`](https://github.com/shinhan-ansimi/ansimi-frontend/commit/f97956d) · [백엔드 `9acb018`](https://github.com/shinhan-ansimi/ansimi-backend/commit/9acb018) · [백엔드 `2aa1f85`](https://github.com/shinhan-ansimi/ansimi-backend/commit/2aa1f85) |
| 주소 검색·화면 배치 개선, 상단 문구 복원, 지도 마커 상세 창 | [`2f97507`](https://github.com/shinhan-ansimi/ansimi-frontend/commit/2f97507) · [`f5e118c`](https://github.com/shinhan-ansimi/ansimi-frontend/commit/f5e118c) · [`29232c9`](https://github.com/shinhan-ansimi/ansimi-frontend/commit/29232c9) |

## 로컬 실행과 검증

1. 프로젝트 루트에서 `npm ci`를 실행한다.
2. `.env.example`을 복사해 `.env.local`을 만들고 `VITE_KAKAO_MAP_KEY`에 카카오 JavaScript 키를 설정한다. 카카오 앱의 허용 도메인에 로컬 주소를 등록한다.
3. `npm run dev`로 시작하고 `http://localhost:5173/`를 연다. 빌드와 린트는 `npm run build`, `npm run lint`로 확인한다. PWA 서비스 워커는 배포 빌드에서 등록한다.

| 개발 서버 URL | 확인할 동작 |
| --- | --- |
| `/?routeExample=1` | 선택한 위치를 바탕으로 예시 경로와 안내 응답을 표시한다. 주변 시설은 카카오 검색을 사용한다. |
| `/?routeExample=1&routeError=1` | 첫 경로 요청 실패, 오류 안내, 재시도를 확인한다. |
| `/?routeExample=1&facilityExample=1` | 예시 경로와 편의점·병원·약국 예시 마커를 함께 확인한다. |

### 확인한 결과와 남은 현장 검증

- 2026-11-24 배포 API를 다시 확인했다. 강남역 → 역삼역은 `200`, `v1`, **932m·약 14분·안내 지점 13개**, 전체 위험도 보통을 반환했다. 서울시청 → 광화문은 `200`, `walking`, **1.2km·약 17분·안내 지점 13개**, 위험도 평가 데이터 없음으로 응답했다. 이전 500 응답과 재검증은 [이슈 #8](https://github.com/shinhan-ansimi/ansimi-frontend/issues/8)에 기록돼 있다.
- 프론트 빌드·린트와 모의 데이터 검증에서 검색 결과 우선순위·시간 초과 시 부분 결과 유지, 시설 거리 필터·중복 제거·요청 취소, GPS 구간 계산, 저장 상태 복원·만료, 시설 상세 창 연결을 확인했다. 백엔드는 Tmap 파서, 경로 서비스, 기존 요청 호환성 관련 테스트를 통과했다.
- 문서 작성 시점에 공개 Vercel 번들에서 일반 도보 요청, 출발·도착 라벨, PWA 매니페스트를 확인했다. 지도 마커 상세 창은 최신 GitHub `develop`에 반영돼 있고, 당시 공개 번들에서는 상세 창 코드를 확인하지 못했다. 배포 확인과 화면 조작 검증을 구분해 기록한다.
- 실제 스마트폰에서는 위치 권한, 걷는 중 다음 안내·이탈 재탐색·도착, PWA 설치·잠금 후 복귀를 확인한다. PC와 모바일에서는 주소 검색 후 즉시 확정, 시설 필터와 상세 창, 상세를 닫은 뒤 지도·목록 위치가 유지되는지 확인한다.

## 기획 및 개발 참고 자료

- [프론트엔드 기획 및 구현 범위](./AnsimiFrontend_Guide.md)
- [React 프로젝트 시작 체크리스트](./React_프로젝트_시작_체크리스트.md)
- [카카오맵 SDK 구현 가이드](./카카오맵_SDK_구현_가이드.md)
- [화면 시안](./design/) · [작업별 기록](./work/)
