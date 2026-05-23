# 프로젝트 참조 정보

## 프로젝트 개요
- 라이브 스트리밍 플랫폼 백엔드
- NestJS + PostgreSQL + AWS IVS

## 주요 기술 스택
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL + Prisma ORM (pgcrypto 확장)
- **Real-time**: Socket.IO + Redis
- **Authentication**: JWT (httpOnly cookies) + Passport
- **Cloud Services**: AWS IVS (라이브 스트리밍), AWS S3 (파일 업로드)
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **Logging**: Graylog integration

## 빠른 시작 명령어
- 개발 서버: `npm run start:dev`
- 디버그 서버: `npm run start:debug`
- 프로덕션 빌드: `npm run build`
- 프로덕션 실행: `npm run start:prod`
- 린트: `npm run lint`
- 타입체크: `npx tsc --noEmit`
- 테스트: `npm test`
- E2E 테스트: `npm run test:e2e`
- 코드 포맷팅: `npm run format`

## 모듈 구조

### 인증 및 사용자 관리
- `/src/auth` - JWT 쿠키 인증/인가, MemberGuard/GuestGuard
- `/src/oauth` - Google OAuth 인증
- `/src/user` - 사용자 관리
- `/src/user-detail` - 사용자 상세 정보 (개인정보 암호화)

### 방송 및 스트리밍
- `/src/ivs` - AWS IVS 라이브 스트리밍 채널 관리
- `/src/channel` - 채널 관리
- `/src/broadcast-setting` - 방송 설정
- `/src/stream` - 스트림 관리
- `/src/stream-viewer` - 스트림 뷰어 관리
- `/src/live` - 라이브 방송 관리
- `/src/play` - 재생 관리

### 실시간 채팅 및 통신
- `/src/chat` - 실시간 채팅 WebSocket Gateway
- `/src/redis` - 분산 메시징 및 실시간 데이터 동기화

### 팬 및 커뮤니티
- `/src/fan` - 팬/팔로우 관계
- `/src/fan-level` - 팬 등급 시스템
- `/src/manager` - 매니저 관리
- `/src/bookmark` - 즐겨찾기
- `/src/blacklist` - 차단 관리

### 결제 및 코인 시스템
- `/src/bootpay` - Bootpay 결제 연동
- `/src/payment` - 결제 시스템
- `/src/coin-topup` - 코인 충전
- `/src/coin-balance` - 코인 잔액 관리
- `/src/coin-usage` - 코인 사용 내역
- `/src/product` - 상품 관리

### 후원 및 정산
- `/src/donation` - 후원 시스템
- `/src/payout-coin` - 코인 출금
- `/src/settlement` - 정산 시스템

### 콘텐츠 및 커뮤니케이션
- `/src/post` - 게시물, 선물 시스템
- `/src/article` - 게시글 관리
- `/src/policy` - 정책 관리

### 인프라 및 공통
- `/src/aws` - S3 파일 업로드, IVS 통합
- `/src/prisma` - Prisma 서비스
- `/src/common` - 공통 모듈
- `/src/config` - 설정 관리
- `/src/constants` - 상수 정의
- `/src/decorators` - 커스텀 데코레이터
- `/src/interceptors` - 인터셉터
- `/src/middle-ware` - 미들웨어
- `/src/utils` - 유틸리티 함수

### 로깅 및 스케줄링
- `/src/log` - 로그 관리
- `/src/graylog-provider` - Graylog 제공자
- `/src/scheduler` - 스케줄러 작업

### 데이터베이스
- `/prisma/schema.prisma` - PostgreSQL 스키마 (pgcrypto 확장)

## 주요 시스템 아키텍처

### 실시간 시스템 (WebSocket + Redis)
- WebSocket 네임스페이스: `/chat`
- Redis Pub/Sub을 통한 서버 간 실시간 메시지 동기화
- Redis를 통한 사용자 상태 관리 및 채팅 데이터 캐싱
- JWT를 통한 WebSocket 연결 인증
- 채팅 시마다 Redis에서 사용자 등급/정보 조회 (DB 조회 최소화)
- 서버 ID 기반 분산 처리 (`server_id_counter`)

### 결제 및 코인 시스템
- **결제**: Bootpay를 통한 결제 처리 (PaymentTransaction, BootpayTransaction)
- **코인 충전**: 사용자 코인 충전 관리 (CoinTopup)
- **코인 잔액**: 사용자별 코인 잔액 관리 (CoinBalance)
- **후원**: 크리에이터 후원 시스템 (Donation)
- **정산**: 크리에이터 수익 정산 (Settlement, PayoutCoin)

### 팬 시스템
- 팬/팔로우 관계 관리
- 팬 등급 시스템 (FanLevel)
- 크리에이터-팬 상호작용 추적

## 인증 방식
- **JWT 쿠키**: httpOnly 쿠키 기반 인증
- **OAuth**: Google OAuth 지원 (googleapis)
- **Guards**: @MemberGuard (회원 전용), @GuestGuard (게스트 허용)
- **WebSocket**: JWT 토큰 기반 인증

## 데이터베이스 작업
1. 스키마 수정: `prisma/schema.prisma` 편집
2. 마이그레이션: `npx prisma migrate dev`
3. 클라이언트 생성: `npx prisma generate`
