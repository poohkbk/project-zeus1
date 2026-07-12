# NAVER 지도 설정 안내

법률사무소 제우 홈페이지의 오시는 길 페이지는 NAVER Maps JavaScript API v3의 Web Dynamic Map을 사용합니다.

## 1. NAVER Cloud Platform에서 애플리케이션 만들기

1. NAVER Cloud Platform 콘솔에 로그인합니다.
2. AI·Application Service 또는 Maps 메뉴에서 Maps 상품을 확인합니다.
3. 새 애플리케이션을 등록합니다.
4. 서비스 항목에서 Web Dynamic Map을 선택합니다.
5. 애플리케이션의 Client ID를 확인합니다.

## 2. Web 서비스 URL 등록

NAVER Cloud 콘솔에서 홈페이지가 실행될 주소를 Web 서비스 URL에 등록합니다.

로컬 테스트 예:

```text
http://localhost:3038
```

운영 도메인 예:

```text
https://www.jwlaw.co.kr
```

배포 환경이 Vercel, Codespaces, 별도 호스팅이라면 실제 접속 URL을 추가로 등록합니다. 등록 형식은 현재 NAVER Cloud 공식 콘솔의 안내를 기준으로 따릅니다.

## 3. 환경변수 입력

로컬에서는 `.env.local`에 입력합니다.

```env
NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID=발급받은_Client_ID
NEXT_PUBLIC_OFFICE_LATITUDE=확인된_위도
NEXT_PUBLIC_OFFICE_LONGITUDE=확인된_경도
NEXT_PUBLIC_NAVER_MAP_URL=네이버지도에서_확인한_장소_URL
```

배포 환경에서는 배포 서비스의 환경변수 설정 화면에 같은 값을 입력합니다.

## 4. 중요한 보안 주의사항

- Web Dynamic Map의 Client ID만 브라우저에서 사용합니다.
- Client Secret, NCP Access Key, Secret Key는 브라우저 코드나 `NEXT_PUBLIC_` 환경변수에 넣지 않습니다.
- Geocoding REST API처럼 서버 비밀키가 필요한 기능은 이번 구현 범위에 포함하지 않습니다.

## 5. 좌표 확인

지도 중심 좌표는 추정해서 넣지 않습니다. NAVER 지도 또는 운영자가 확인한 공식 위치 좌표를 입력합니다.

좌표가 비어 있으면 홈페이지는 깨지지 않고, 주소와 Naver 지도 바로가기 버튼이 있는 대체 카드가 표시됩니다.

## 6. 오류 확인

지도가 보이지 않으면 다음을 확인합니다.

- `NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID`가 입력되어 있는지
- NAVER Cloud에 로컬 또는 운영 도메인이 등록되어 있는지
- `NEXT_PUBLIC_OFFICE_LATITUDE`, `NEXT_PUBLIC_OFFICE_LONGITUDE`가 숫자로 입력되어 있는지
- 브라우저 콘솔에 인증 오류가 표시되는지
- NAVER Cloud 이용량 또는 과금 상태에 문제가 없는지
