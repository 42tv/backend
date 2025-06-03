# 42TV Backend Project Guide

## 프로젝트 개요
- 라이브 스트리밍 플랫폼 백엔드
- NestJS + PostgreSQL + AWS IVS

## 빠른 시작
- 개발 서버: `npm run start:dev`
- 테스트: `npm test`
- 린트: `npm run lint`
- 타입체크: `npx tsc --noEmit`

## 작업 시 필수 확인사항
1. 코드 수정 후 반드시 실행:
   - `npm run lint`
   - `npx tsc --noEmit`
2. 개인정보는 반드시 암호화 (UserDetail 참고)
3. API 추가 시 Swagger 데코레이터 필수

## 주요 디렉토리 구조
- `/src/auth` - 인증/인가
- `/src/user` - 사용자 관리
- `/src/ivs` - 라이브 스트리밍
- `/src/chat` - 실시간 채팅
- `/prisma/schema.prisma` - DB 스키마

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
- 유닛 테스트: `*.spec.ts`
- mockRepository 패턴 사용
- 주요 비즈니스 로직 테스트 필수