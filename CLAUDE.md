# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 42TV Backend Project Guide

## 프로젝트 개요
- 라이브 스트리밍 플랫폼 백엔드
- NestJS + PostgreSQL + AWS IVS

## 빠른 시작
- 개발 서버: `npm run start:dev`
- 프로덕션 빌드: `npm run build`
- 프로덕션 실행: `npm run start:prod`
- 린트: `npm run lint`
- 타입체크: `npx tsc --noEmit`

## 작업 시 필수 확인사항
1. 코드 수정 후 반드시 실행:
   - `npm run lint`
   - `npx tsc --noEmit`
2. 개인정보는 반드시 암호화 (UserDetail 참고)
3. API 추가 시 Swagger 데코레이터 필수

## 핵심 아키텍처

### 실시간 시스템 (WebSocket + Redis)
- WebSocket 네임스페이스: `/chat`
- Redis Pub/Sub을 통한 서버 간 실시간 메시지 동기화
- Redis를 통한 사용자 상태 관리 및 채팅 데이터 캐싱
- JWT를 통한 WebSocket 연결 인증
- 채팅 시마다 Redis에서 사용자 등급/정보 조회 (DB 조회 최소화)
- 서버 ID 기반 분산 처리 (`server_id_counter`)

### 모듈 구조
- `/src/auth` - JWT 쿠키 인증/인가, MemberGuard/GuestGuard
- `/src/user` - 사용자 관리, UserDetail (개인정보 암호화)
- `/src/ivs` - AWS IVS 라이브 스트리밍 채널 관리
- `/src/chat` - 실시간 채팅 WebSocket Gateway
- `/src/redis` - 분산 메시징 및 실시간 데이터 동기화
- `/src/fan` - 팬/팔로우 관계, FanLevel (등급 시스템)
- `/src/post` - 게시물, 선물 시스템
- `/src/aws` - S3 파일 업로드, IVS 통합
- `/prisma/schema.prisma` - PostgreSQL 스키마 (pgcrypto 확장)

## 인증 방식
- JWT 쿠키 기반 (httpOnly)
- Guards: @MemberGuard (회원), @GuestGuard (게스트 허용)

## 데이터베이스 작업
1. 스키마 수정: `prisma/schema.prisma` 편집
2. 마이그레이션: `npx prisma migrate dev`
3. 클라이언트 생성: `npx prisma generate`

## 코딩 컨벤션
- 서비스 로직은 repository 패턴 사용
- DTO에 class-validator 데코레이터 필수
- 에러는 HttpException 사용

## 주의사항
- AWS IVS 채널 생성 시 중복 확인 필수
- Redis 연결 상태 확인 후 채팅 기능 사용
- 파일 업로드는 5MB 제한

## 테스트 작성
- 유닛 테스트: `*.spec.ts` (src 디렉토리 내)
- E2E 테스트: `test/` 디렉토리
- mockRepository 패턴 사용, PrismaService 트랜잭션 롤백
- 테스트 모듈: `@nestjs/testing`의 `Test.createTestingModule()` 사용
- 주요 비즈니스 로직 테스트 필수

## 주요 기술 스택
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL + Prisma ORM (pgcrypto 확장)
- **Real-time**: Socket.IO + Redis
- **Authentication**: JWT (httpOnly cookies) + Passport
- **Cloud Services**: AWS IVS (라이브 스트리밍), AWS S3 (파일 업로드)
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **Logging**: Graylog integration