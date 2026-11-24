# 안심이 개발 문서

## 작업 기록

| 이슈 | 작업 문서 | 현재 단계 |
| --- | --- | --- |
| #6 | [지도 및 주소 검색 기반 출발지·도착지 설정](./work/issue-6-location-selection.md) | 지도 선택 안내·중앙 마커·후보 주소 조회 및 확정 연결 완료, 브라우저 검증 전 |

## 다음 작업 — 시범 권역 표시와 추천 경로 연동

메인 화면(`/`)의 카카오맵에 강남구 시범 서비스 권역을 표시해 사용자가 출발지와 도착지를 고를 때 서비스 범위를 확인할 수 있게 한다. 두 위치를 확정하면 추천 경로를 요청하고 응답받은 구간을 위험도별로 표시한다. [현재 메인 화면](../src/pages/MainPage.tsx) · [지도 컴포넌트](../src/components/KaKaoMap.tsx)

### API와 좌표 형식

| 항목 | 확인한 내용 |
| --- | --- |
| 백엔드 주소 | `https://ansimi-backend-production.up.railway.app` |
| 경로 추천 | `POST /api/routes/recommend`에 `origin`과 `destination`을 보낸다. 각각 필수 `coord: [경도, 위도]`와 선택 `name`을 가진다. |
| 추천 결과 | `recommendedIndex`와 `index`가 일치하는 후보를 `candidates`에서 찾는다. 후보의 `distanceM`, `durationMin`, `riskLevel`, `segments`를 표시할 때 사용한다. |
| 구간 형식 | `segments`는 GeoJSON `FeatureCollection`이다. 각 `Feature`의 `geometry`는 `MultiLineString`이며 `properties`에 `level`(`GREEN`, `YELLOW`, `RED`)과 `lengthM`이 있다. |
| 서비스 권역 | `GET /api/service-area`는 강남구 시범 지역의 `MultiPolygon`을 담은 GeoJSON `Feature`를 반환한다. 백엔드는 두 위치의 권역 포함 여부와 거리 제한을 검사한다. |
| CORS 확인 | `http://localhost:5173`과 `https://ansimi-frontend.vercel.app`에서 오는 `POST` 및 `Content-Type: application/json` 요청에 필요한 CORS 사전 요청이 허용되는 것을 확인했다. |

프론트는 `Location`을 `{ latitude, longitude, address }`로 유지한다. 요청을 만들 때 `coord: [location.longitude, location.latitude]`로 변환한다. 응답의 GeoJSON 좌표 `[lng, lat]`는 카카오맵에 넘길 때 `new maps.LatLng(lat, lng)`로 변환한다. [프론트 위치 타입](../src/types/location.ts) · [배포 Swagger](https://ansimi-backend-production.up.railway.app/swagger-ui/index.html) · [OpenAPI JSON](https://ansimi-backend-production.up.railway.app/v3/api-docs) · [백엔드 요청 DTO](https://github.com/shinhan-ansimi/ansimi-backend/blob/develop/src/main/java/com/ansimi/route/dto/Place.java)

Swagger는 `segments`의 내부 형식을 `JsonNode`로 표시한다. 위 GeoJSON 구조는 백엔드의 응답 생성 코드에서 확인했다. 배포 서버에서 Swagger와 서비스 권역 조회는 확인했으며, 경로 추천 성공 응답은 연동 단계에서 확인해야 한다. [구간 응답 생성 코드](https://github.com/shinhan-ansimi/ansimi-backend/blob/develop/src/main/java/com/ansimi/risk/RiskScoringService.java)

### 구현 및 검증 순서

- [ ] 메인 화면에서 `GET /api/service-area`로 시범 권역을 조회한다. 응답의 GeoJSON `MultiPolygon`을 카카오맵 `Polygon`으로 그려 경계선과 옅은 음영을 적용한다. 지도 범례에 ‘시범 서비스 권역’을 표시한다. [카카오맵 도형 예제](https://apis.map.kakao.com/web/sample/drawShape/)
- [ ] `MainPage`에서 출발지와 도착지를 모두 확정하면 ‘경로 찾기’ 버튼을 활성화한다. 강남구 시범 권역 안의 테스트 좌표로 배포 API에 추천을 요청하고 성공 응답을 확인한다.
- [ ] 추천 후보의 `segments`를 `KaKaoMap`에 전달한다. `MultiLineString`을 구성하는 선마다 `Polyline`을 만들고 위험도 등급별 색상을 적용한다. 거리·예상 시간·범례를 함께 표시한다. [카카오맵 Polyline 문서](https://apis.map.kakao.com/web/documentation/#Polyline)
- [ ] 조회 중에는 중복 요청을 막고 권역 밖·거리 제한·조회 실패를 안내한다. 출발지나 도착지를 변경하거나 재탐색할 때 이전 경로를 지우고, 이전 요청의 응답이 최신 결과를 덮어쓰지 않도록 한다. 구간이 비어 있으면 평가 데이터가 없는 상태를 표시한다.
- [ ] 로컬과 Vercel에서 시범 권역 경계가 API 응답과 일치하는지 확인하고, 출발·도착 확정부터 경로 표시까지 검증한다. 모바일에서 권역 경계와 범례를 읽을 수 있는지, 권역 음영 위에서도 경로와 마커가 잘 보이는지 확인한다. 재탐색 후에는 이전 경로가 사라지고 권역 경계가 계속 표시되는지 확인한다.

로컬 개발 서버에서 `/?routeExample=1`로 열면 선택한 위치를 바탕으로 개발용 예시 경로를 확인할 수 있다. `&routeError=1`을 붙이면 첫 요청 실패 후 재시도를 확인할 수 있다. 배포 빌드에서는 실제 추천 API를 사용한다.

배포 API 확인 결과 `GET /api/service-area`는 로컬과 Vercel 출처에 모두 HTTP 200과 CORS 헤더를 반환했다. 강남역 인근에서 역삼역 인근으로 보낸 추천 요청은 HTTP 500(`INTERNAL_ERROR`)을 반환했다. 거리 제한 밖 요청의 HTTP 400(`INVALID_DISTANCE`)은 확인했다.

### AI 데이터와 후속 지도 표시

AI 파이프라인은 안전시설과 위험 요인을 집계해 `risk_grid.geojson`을 생성한다. 백엔드는 이 파일을 배치로 PostGIS에 적재하고, Tmap 후보 경로와 위험 격자가 겹치는 부분을 계산해 구간별 등급을 반환한다. 지도 범례에서 `RED`는 ‘위험도 높음’으로 표시한다. [AI 파이프라인](https://github.com/shinhan-ansimi/ansimi-ai/blob/develop/README.md) · [백엔드 격자 적재 코드](https://github.com/shinhan-ansimi/ansimi-backend/blob/develop/src/main/java/com/ansimi/riskimport/RiskGridImportService.java) · [경로 추천 서비스](https://github.com/shinhan-ansimi/ansimi-backend/blob/develop/src/main/java/com/ansimi/route/RouteService.java)

현재 Swagger에는 안전시설 위치, 원본 범죄주의구간, 경로 밖 위험 격자에 대한 별도 조회 API가 없다. 이 데이터를 지도에 표시하려면 백엔드와 조회 범위 및 응답 형식을 합의한다. 시설 좌표는 `Marker`, 선형 구간은 `Polyline`, 면형 격자는 `Polygon`으로 표시할 수 있다. [카카오맵 도형 예제](https://apis.map.kakao.com/web/sample/drawShape/)

로컬 개발 서버에서 `/?routeExample=1&facilityExample=1`로 열면 강남역과 역삼역 주변의 예시 편의점·병원·가게 마커를 추천 경로와 함께 확인할 수 있다. 마커나 목록에서 시설을 선택하면 상세 정보가 열린다. 예시 시설은 개발 모드에서 표시한다.

## 기획 및 개발 가이드

- [안심이 프론트엔드 기획 및 구현 범위](./AnsimiFrontend_Guide.md)
- [React 프로젝트 시작 체크리스트](./React_프로젝트_시작_체크리스트.md)
- [카카오맵 SDK 구현 가이드](./카카오맵_SDK_구현_가이드.md)
- [화면 시안 폴더](./design/)

작업별 요구사항, 구현 내용, 남은 작업과 검증 항목은 `work` 폴더에 기록합니다.
