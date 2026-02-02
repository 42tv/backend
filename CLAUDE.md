# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# 📋 프로젝트 정보

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

---

# 🔧 개발 규칙

## 백엔드 개발 지침

### 명확성 및 재사용성
- 모든 서비스, 모듈, 유틸리티는 모듈화하고 재사용 가능하도록 설계합니다.
- 동일하거나 유사한 로직은 공용 함수나 라이브러리로 통합하여 중복 코드를 방지합니다.
- API 요청·응답 스키마, 에러 처리, 인증 로직 등 공통 패턴은 표준화된 미들웨어 또는 유틸로 관리합니다.

### 일관성
- API 네이밍, 응답 구조, 상태 코드 사용, 예외 처리 규칙을 일관되게 유지합니다.
- DB 스키마, ORM 모델, 서비스 계층 구조 등 아키텍처 전반에서 통일된 설계 원칙을 적용합니다.
- 로깅, 모니터링, 보안 정책 등 운영 관련 설정도 전 프로젝트에서 동일하게 적용합니다.

### 단순성
- 서비스·컨트롤러는 단일 책임 원칙(SRP) 을 준수하며, 기능을 작게 나누어 유지보수를 용이하게 합니다.
- 불필요한 복잡성을 유발하는 과도한 추상화, 중첩된 의존성, 비효율적인 쿼리는 피합니다.
- 환경 설정, 배포 스크립트, 빌드 프로세스 역시 단순하고 명확하게 유지합니다.

### 데모 지향성
- API, WebSocket, 외부 도구 연동, 멀티 요청 처리 등 주요 기능을 빠르게 시연 가능하도록 구조를 설계합니다.
- 데이터 시딩, 모의 서비스(Mock Service), Swagger/Redoc 기반 문서화로 빠른 프로토타입 제작을 지원합니다.
- 하지만 Swagger 코드는 당분간 작성하지 않습니다.
- 스트리밍 API, 이벤트 기반 처리, 확장 가능한 모듈 구조를 갖춥니다.

### 품질 보장
- 테스트 코드(단위·통합·E2E)를 작성하여 기능의 정확성을 보장합니다.
- 보안(인증·인가, 데이터 검증, XSS/SQLi 방지)과 성능(쿼리 최적화, 캐싱, 비동기 처리)을 고려합니다.
- 코드 리뷰, CI/CD 파이프라인, 정적 분석 도구를 통해 품질을 지속적으로 관리합니다.

## 코딩 컨벤션
- 서비스 로직은 repository 패턴 사용
- DTO에 class-validator 데코레이터 필수
- 에러는 HttpException 사용

## 테스트 작성 규칙
- 유닛 테스트: `*.spec.ts` (src 디렉토리 내)
- E2E 테스트: `test/` 디렉토리
- mockRepository 패턴 사용, PrismaService 트랜잭션 롤백
- 테스트 모듈: `@nestjs/testing`의 `Test.createTestingModule()` 사용
- 주요 비즈니스 로직 테스트 필수

## 작업 시 필수 확인사항
1. 코드 수정 후 반드시 실행:
   - `npm run lint`
   - `npx tsc --noEmit`
2. 개인정보는 반드시 암호화 (UserDetail 참고)

## 실시간 채팅 구조 개발 규칙
실시간 채팅방에 관련된 Redis 구조의 코드를 작업할 때는 항상 서버가 여러개로 스케일링 될 경우를 고려하여 작성해달라

## 보안 및 운영 주의사항
- **개인정보 보호**: UserDetail 모델의 개인정보(주민번호, 전화번호, 이메일, 주소)는 반드시 암호화 (pgcrypto)
- **AWS IVS**: 채널 생성 시 중복 확인 필수
- **Redis**: 연결 상태 확인 후 채팅 기능 사용
- **파일 업로드**: 5MB 제한 (Sharp를 통한 이미지 최적화)
- **결제**: Bootpay 트랜잭션 처리 시 멱등성(idempotency) 보장 필요
- **코인 시스템**: 잔액 차감/충전 시 트랜잭션 처리로 데이터 정합성 보장
- **정산**: 중복 정산 방지 및 정산 내역 감사 로그 필수