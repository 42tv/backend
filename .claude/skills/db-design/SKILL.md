# DB Design Skill

<command-name>/db-design</command-name>
<command-description>Prisma 스키마 설계, 분석, 마이그레이션 가이드</command-description>

## Instructions

이 스킬은 42TV 프로젝트의 DB 설계를 돕습니다. 사용자의 요청에 따라 새 테이블 설계, 기존 스키마 분석, 마이그레이션 가이드를 제공합니다.

### 작업 수행 전 필수 확인
1. `/root/fairly/backend/prisma/schema.prisma` 파일을 읽어 현재 스키마 파악
2. 기존 모델들의 네이밍 컨벤션, 관계 패턴 확인

### 프로젝트 DB 컨벤션

#### 네이밍 규칙
- **모델명**: PascalCase (예: `UserDetail`, `FanLevel`)
- **테이블명**: snake_case, 복수형 (`@@map("user_details")`)
- **필드명**: snake_case (예: `created_at`, `user_idx`)
- **관계 참조 필드**: `_idx` 접미사 (예: `user_idx`, `broadcaster_idx`)

#### DateTime 필드 기본값
```prisma
created_at DateTime @default(dbgenerated("timezone('Asia/Seoul', now())"))
updated_at DateTime @updatedAt
```

#### 필수 관계 패턴
- `onDelete: Cascade` - 부모 삭제 시 자식도 삭제
- `onDelete: SetNull` - 5년 보관 의무 데이터 (금융, 결제)

#### 개인정보 보호 (필수)
개인정보는 암호화 필요 (AES + Base64). UserDetail 모델 참조:
- 이름, 주민등록번호, 전화번호, 이메일, 주소

#### 5년 보관 의무 데이터 패턴
금융/결제 관련 테이블은 사용자 삭제 후에도 5년간 보관:
```prisma
user_idx              Int?      // nullable로 설정
deleted_user_snapshot Json?     // 삭제된 사용자 정보 스냅샷
user_deleted_at       DateTime?
should_delete_at      DateTime? // 5년 후 삭제 예정일
```

### 새 테이블 설계 시 절차

1. **요구사항 분석**
   - 어떤 데이터를 저장하는가?
   - 다른 모델과 어떤 관계인가?
   - 개인정보가 포함되는가?
   - 법적 보관 의무가 있는가?

2. **모델 설계 템플릿**
```prisma
// [모델 설명 한국어 주석]
model ModelName {
  id         Int      @id @default(autoincrement())
  // 또는 문자열 ID: id String @id @default(cuid())

  // 데이터 필드들
  field_name Type    // 필드 설명

  // 상태 필드
  is_active  Boolean @default(true)

  // 시간 필드
  created_at DateTime @default(dbgenerated("timezone('Asia/Seoul', now())"))
  updated_at DateTime @updatedAt

  // 관계
  parent_idx Int
  parent     ParentModel @relation(fields: [parent_idx], references: [idx], onDelete: Cascade)

  // 제약조건
  @@unique([field1, field2])
  @@index([field_name], name: "idx_model_field")
  @@map("model_names")
}
```

3. **관계 설정 시 고려사항**
   - 1:1 관계: 자식 모델에 `@unique` 제약 + 부모에 optional relation
   - 1:N 관계: 부모에 배열 relation, 자식에 foreign key
   - N:M 관계: 중간 테이블(junction table) 생성

4. **User 모델과 연결 시**
   User 모델에 relation 필드 추가 필요:
   ```prisma
   // User 모델에 추가
   newModels   NewModel[] @relation("RelationName")
   ```

### 스키마 분석 시 체크리스트

- [ ] 인덱스가 적절히 설정되었는가?
- [ ] N+1 쿼리 문제가 발생할 수 있는 관계가 있는가?
- [ ] nullable 필드가 적절한가?
- [ ] enum 사용이 적절한가?
- [ ] 데이터 정규화/비정규화 수준이 적절한가?
- [ ] 개인정보 암호화가 적용되었는가?
- [ ] 법적 보관 의무 데이터 처리가 되었는가?

### 마이그레이션 절차

1. **스키마 수정 후**
   ```bash
   cd backend
   npx prisma migrate dev --name 마이그레이션_이름
   ```

2. **프로덕션 배포 시**
   ```bash
   npx prisma migrate deploy
   ```

3. **클라이언트 재생성**
   ```bash
   npx prisma generate
   ```

4. **주의사항**
   - 컬럼 삭제/이름 변경은 데이터 손실 위험
   - 기존 데이터가 있는 컬럼에 NOT NULL 추가 시 기본값 필요
   - 대용량 테이블 마이그레이션은 락 발생 고려

### 응답 형식

스키마 설계 결과는 다음 형식으로 제공:

1. **모델 정의** - Prisma 스키마 코드
2. **User 모델 변경 사항** - 필요한 경우
3. **인덱스 권장사항** - 쿼리 패턴 기반
4. **마이그레이션 명령어** - 실행할 명령어
5. **주의사항** - 데이터 마이그레이션, 보안 등
