# 충전형 후원 시스템 재설계

## 🎯 시스템 흐름 개요

### 기존: 직접 후원 방식
```
결제 → 구매 → 즉시 후원
```

### 새로운: 충전형 방식
```
결제 → 충전 → 지갑 잔액 → 후원 → 정산
```

---

## 📊 테이블 설계

### **1. payment_transaction (결제 거래 내역) - 법적 증빙 핵심**
```prisma
model PaymentTransaction {
  id                String    @id @default(cuid())
  user_idx          Int?      // 결제자 (5년 보관 위해 nullable)

  // PG사 결제 정보 (법적 증빙 필수)
  pg_provider       String    // "inicis", "toss", "kakaopay"
  pg_transaction_id String    @unique // PG사 거래 고유번호
  payment_method    String    // "card", "bank_transfer", "mobile"

  // 결제 금액
  amount            Int       // 결제 금액 (원 단위)
  currency          String    @default("KRW")

  // 상태 및 시간
  status            PaymentTransactionStatus @default(PENDING)
  requested_at      DateTime  @default(now())
  approved_at       DateTime?
  canceled_at       DateTime?

  // PG사 응답 원본 (감사용)
  pg_response       Json?

  // 5년 보관 의무
  deleted_user_snapshot Json?
  user_deleted_at   DateTime?
  should_delete_at  DateTime? // 5년 후 삭제

  // Relations
  user              User?     @relation(onDelete: SetNull)
  topups            CoinTopup[]
  refunds           RefundLog[]

  @@map("payment_transactions")
}

enum PaymentTransactionStatus {
  PENDING   // 결제 진행중
  SUCCESS   // 결제 성공
  FAILED    // 결제 실패
  CANCELED  // 결제 취소
}
```

### **2. product (코인 상품)**
```prisma
model Product {
  id              Int       @id @default(autoincrement())

  // 상품 정보
  name            String    // "100 코인"
  description     String?   // 상품 설명
  base_coins      Int       // 기본 코인량
  bonus_coins     Int       @default(0) // 보너스 코인량
  total_coins     Int       // 실제 지급될 총 코인량 (base_coins + bonus_coins)
  price           Int       // 가격 (원)

  // 상태
  is_active       Boolean   @default(true)
  sort_order      Int       @default(0)

  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  // Relations
  topups          CoinTopup[]

  @@map("products")
}
```

### **3. coin_topup (코인 충전 내역) - 결제와 지갑 연결**
```prisma
model CoinTopup {
  id              String    @id @default(cuid())
  transaction_id  String    // 결제 거래 ID
  user_idx        Int?      // 충전자 (5년 보관 위해 nullable)

  // 상품 정보 (충전 시점 스냅샷)
  product_id      Int       // 구매한 상품

  // 충전 정보 (시점 고정 - 나중에 상품 정보가 변경되어도 보존)
  product_name    String    // 상품명 스냅샷
  base_coins      Int       // 기본 코인량
  bonus_coins     Int       @default(0) // 보너스 코인량
  total_coins     Int       // 실제 지급된 총 코인량
  paid_amount     Int       // 실제 결제 금액
  coin_unit_price Float     // 코인당 가격

  // 상태 및 시간
  status          TopupStatus @default(PENDING)
  topped_up_at    DateTime  @default(now())

  // 5년 보관 의무
  deleted_user_snapshot Json?
  user_deleted_at DateTime?

  // Relations
  transaction     PaymentTransaction @relation(fields: [transaction_id], references: [id])
  user            User?       @relation(onDelete: SetNull)
  product         Product @relation(fields: [product_id], references: [id])
  usages          CoinUsage[] // 이 충전분의 사용 내역

  @@map("coin_topups")
}

enum TopupStatus {
  PENDING     // 충전 대기
  COMPLETED   // 충전 완료
  FAILED      // 충전 실패
  REFUNDED    // 환불됨
}
```

### **4. wallet_balance (지갑 잔액) - 편의성**
```prisma
model WalletBalance {
  user_idx      Int       @id // 사용자 (Primary Key)
  coin_balance  Int       @default(0) // 현재 코인 잔액
  updated_at    DateTime  @updatedAt

  // Relations
  user          User      @relation(fields: [user_idx], references: [idx], onDelete: Cascade)

  @@map("wallet_balances")
}
```

### **5. donation (후원 내역) - 실제 사용**
```prisma
model Donation {
  id            String    @id @default(cuid())
  donor_idx     Int?      // 후원자 (5년 보관 위해 nullable)
  streamer_idx  Int?      // 스트리머 (5년 보관 위해 nullable)

  // 후원 정보 (코인으로 통일)
  coin_amount   Int       // 후원한 코인량
  coin_value    Int       // 코인의 원화 가치 (1코인=1원 또는 충전 시점 기준)

  // 메시지
  message       String?   // 후원 메시지

  // 방송/스트림 정보 (선택적)
  stream_idx    Int?      // 어떤 방송에서의 후원인지

  // 시간
  donated_at    DateTime @default(now())

  // 5년 보관 의무
  deleted_donor_snapshot    Json?     // 후원자 삭제 시
  deleted_streamer_snapshot Json?     // 스트리머 삭제 시
  donor_deleted_at          DateTime?
  streamer_deleted_at       DateTime?
  should_delete_at          DateTime? // 5년 후 삭제

  // Relations
  donor         User?       @relation("SentDonations", fields: [donor_idx], references: [idx], onDelete: SetNull)
  streamer      User?       @relation("ReceivedDonations", fields: [streamer_idx], references: [idx], onDelete: SetNull)
  stream        Stream?     @relation(fields: [stream_idx], references: [idx])
  usages        CoinUsage[] // 어떤 구매분에서 차감되었는지

  @@map("donations")
}
```

### **6. coin_usage (코인 사용 내역) - FIFO 추적**
```prisma
model CoinUsage {
  id            Int         @id @default(autoincrement())
  topup_id      String      // 충전 ID
  donation_id   String      // 후원 ID
  used_coins    Int         // 사용된 코인량
  used_at       DateTime    @default(now())

  // Relations
  topup         CoinTopup   @relation(fields: [topup_id], references: [id])
  donation      Donation    @relation(fields: [donation_id], references: [id])

  @@map("coin_usages")
}
```

### **7. refund_log (환불 내역)**
```prisma
model RefundLog {
  id              String    @id @default(cuid())
  transaction_id  String    // 원본 결제 거래
  topup_id        String?   // 충전 내역 (있는 경우)

  // 환불 정보
  refund_amount   Int       // 환불 금액
  refund_reason   String    // 환불 사유

  // 상태 및 시간
  status          RefundStatus @default(PENDING)
  requested_at    DateTime  @default(now())
  processed_at    DateTime?

  // PG사 환불 정보
  pg_refund_id    String?   @unique
  pg_response     Json?

  // Relations
  transaction     PaymentTransaction @relation(fields: [transaction_id], references: [id])
  topup           CoinTopup?         @relation(fields: [topup_id], references: [id])

  @@map("refund_logs")
}

enum RefundStatus {
  PENDING     // 환불 요청
  PROCESSING  // 환불 처리중
  SUCCESS     // 환불 완료
  FAILED      // 환불 실패
  REJECTED    // 환불 거절
}
```

### **8. settlement (정산 내역)**
```prisma
model Settlement {
  id                String    @id @default(cuid())
  receiver_idx      Int?      // 정산 대상자 (5년 보관 위해 nullable)

  // 정산 기간
  period_start      DateTime  // 정산 시작일
  period_end        DateTime  // 정산 종료일

  // 정산 금액
  total_support_value Int     // 총 후원 받은 가치
  platform_fee_rate   Float   // 플랫폼 수수료율 (%)
  platform_fee_amount Int     // 수수료 금액
  payout_amount       Int     // 실제 지급액

  // 상태
  status            SettlementStatus @default(PENDING)
  calculated_at     DateTime  @default(now())
  paid_at           DateTime?

  // 5년 보관 의무
  deleted_user_snapshot Json?
  user_deleted_at   DateTime?
  should_delete_at  DateTime?

  // Relations
  receiver          User?     @relation(fields: [receiver_idx], references: [idx], onDelete: SetNull)

  @@map("settlements")
}

enum SettlementStatus {
  PENDING   // 정산 대기
  APPROVED  // 정산 승인
  PAID      // 지급 완료
  REJECTED  // 정산 거절
}
```

### **9. User 모델에 Relations 추가**
```prisma
model User {
  // 기존 필드들...

  // 결제 관련
  paymentTransactions PaymentTransaction[]
  coinTopups         CoinTopup[]
  walletBalance      WalletBalance? // 1:1 관계 (사용자당 하나의 지갑)

  // 후원 관련
  sentDonations      Donation[] @relation("SentDonations")
  receivedDonations  Donation[] @relation("ReceivedDonations")

  // 정산 관련
  settlements        Settlement[]
}
```

---

## 🔄 시스템 플로우 예시

### **1. 구매 과정**
```
1. 사용자가 "100 코인 상품" 선택
2. PaymentTransaction 생성 (PG사 결제)
3. 결제 성공 시 CoinTopup 생성 (상품 정보 스냅샷)
4. WalletBalance 업데이트 (코인 잔액 증가)
```

### **2. 후원 과정 (FIFO 방식)**
```
1. 사용자가 "50 코인" 후원
2. WalletBalance에서 코인 잔액 확인
3. Donation 생성
4. CoinUsage로 어떤 충전분에서 차감했는지 기록
   - 가장 오래된 충전분부터 사용 (FIFO)
5. WalletBalance의 코인 잔액 차감
```

### **3. 환불 과정**
```
1. 미사용 충전분만 환불 가능
2. RefundLog 생성
3. PG사 환불 API 호출
4. 성공 시 WalletBalance 차감
```

### **4. 정산 과정**
```
1. 월말에 각 스트리머의 후원 내역 집계
2. Settlement 생성 (수수료 계산)
3. 정산 승인 후 실제 송금
```

---

## ✅ 법적 준수사항

### **5년 보관 대상**
- PaymentTransaction (결제 거래)
- CoinTopup (코인 충전 내역)
- Donation (후원 내역)
- Settlement (정산 내역)

### **3년 보관 대상**
- RefundLog (환불/분쟁 처리)

### **추적 가능성**
```sql
-- 특정 사용자의 충전→후원→정산 전체 추적
SELECT
  pt.pg_transaction_id,
  ct.total_coins as topped_up,
  d.coin_amount as used,
  d.donated_at
FROM payment_transactions pt
JOIN coin_topups ct ON pt.id = ct.transaction_id
JOIN coin_usages cu ON ct.id = cu.topup_id
JOIN donations d ON cu.donation_id = d.id
WHERE pt.user_idx = ?
ORDER BY pt.requested_at;
```

## 📊 최종 테이블 구조 요약 (8개)

1. **PaymentTransaction** - PG사 결제 거래 (법적 증빙)
2. **Product** - 코인 상품 (100코인, 500코인 등)
3. **CoinTopup** - 코인 충전 내역 (결제↔지갑 연결)
4. **WalletBalance** - 코인 잔액 (사용자당 1개)
5. **Donation** - 후원 내역 (코인으로 통일)
6. **CoinUsage** - 충전-사용 연결 (FIFO 추적)
7. **RefundLog** - 환불 내역
8. **Settlement** - 정산 내역

**핵심 변경사항:**
- ❌ SupportItem 테이블 제거 (복잡성 제거)
- ❌ ChargePackage → Product로 명명 변경 (더 직관적)
- ❌ CoinPurchase → CoinTopup으로 명명 변경 (충전 의미 강조)
- ❌ SupportTransfer → Donation으로 명명 변경 (후원 의미 명확화)
- ❌ PurchaseUsage → CoinUsage로 명명 변경 (코인 사용 추적)
- ❌ unit_price, is_featured 필드 제거 (불필요한 복잡성)
- ✅ 모든 후원을 "코인"으로 통일
- ✅ 단순하고 명확한 구조
- ✅ 비즈니스 로직에 맞는 직관적 네이밍
- ✅ 완전한 추적성과 법적 준수

이 설계로 **완전한 추적성과 법적 준수**가 가능합니다. 이제 실제 Prisma 스키마에 적용하시겠습니까?