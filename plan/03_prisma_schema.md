# 3. Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgcrypto]
}

// ━━━━━━━━━━━━━━━━ ENUMS ━━━━━━━━━━━━━━━━

enum UserStatus {
  INACTIVE
  ACTIVE
  SUSPENDED
  BLOCKED
}

enum UserRole {
  INVESTOR
  TEAM_LEADER
  FINANCE_MANAGER
  ADMIN
  SUPER_ADMIN
}

enum TransactionType {
  REGISTRATION_FEE
  WALLET_TOPUP
  INVESTMENT_DEBIT
  PROFIT_CREDIT
  WITHDRAWAL
  REFUND
  ADMIN_CREDIT
  ADMIN_DEBIT
}

enum TransactionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REVERSED
}

enum ProjectStatus {
  PLANNED
  LAND_ACQUIRED
  LEGAL_IN_PROGRESS
  APPROVED
  UNDER_DEVELOPMENT
  READY_FOR_SALE
  COMPLETED
  CLOSED
}

enum PlotStatus {
  AVAILABLE
  HELD
  RESERVED
  SOLD
}

enum PlotType {
  CORNER
  MIDDLE
  DOUBLE_ROAD
}

enum SalePaymentStatus {
  PENDING
  PARTIAL
  COMPLETED
}

enum HoldStatus {
  ACTIVE
  RELEASED_MANUAL
  RELEASED_EXPIRED
  RELEASED_ADMIN
  CONVERTED_TO_SALE
}

enum DistributionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  ROLLED_BACK
}

// ━━━━━━━━━━━━━━━━ MODELS ━━━━━━━━━━━━━━━━

model User {
  id                   String     @id @default(uuid()) @db.Uuid
  email                String     @unique @db.VarChar(255)
  mobile               String     @unique @db.VarChar(15)
  password_hash        String     @db.VarChar(255)
  full_name            String     @db.VarChar(200)
  address              String?    @db.VarChar(500)
  date_of_birth        DateTime?  @db.Date
  occupation           String?    @db.VarChar(100)
  profile_photo_url    String?    @db.VarChar(500)

  // PII — encrypted at rest via Prisma middleware
  pan_number           String?    @db.VarChar(500)
  aadhaar_number       String?    @db.VarChar(500)
  bank_account_number  String?    @db.VarChar(500)
  bank_ifsc            String?    @db.VarChar(500)
  upi_id               String?    @db.VarChar(500)

  status               UserStatus @default(INACTIVE)
  role                 UserRole   @default(INVESTOR)
  is_mobile_verified   Boolean    @default(false)
  is_email_verified    Boolean    @default(false)
  activation_reason    String?    @db.VarChar(50) // 'TEAM' | 'INVESTMENT' | 'BOTH'
  total_investment     Int        @default(0)      // paise — cached, recomputed on invest

  // Password history (last 5 hashes, JSON array)
  password_history     String[]   @default([])

  created_at           DateTime   @default(now()) @db.Timestamptz()
  updated_at           DateTime   @updatedAt       @db.Timestamptz()
  deleted_at           DateTime?  @db.Timestamptz()

  // Relations
  wallet               Wallet?
  sessions             UserSession[]
  led_team             Team?        @relation("TeamLeader")
  team_memberships     TeamMember[]
  investments          Investment[]
  plot_holds           PlotHold[]
  referrals_made       Referral[]   @relation("Referrer")
  referrals_received   Referral[]   @relation("Referee")
  profit_distributions ProfitDistribution[]

  @@index([email])
  @@index([mobile])
  @@index([status])
  @@index([role])
  @@index([deleted_at])
}

model UserSession {
  id              String   @id @default(uuid()) @db.Uuid
  user_id         String   @db.Uuid
  token_family    String   @db.Uuid
  token_hash      String   @db.VarChar(255)
  ip_address      String   @db.VarChar(45)
  user_agent_hash String   @db.VarChar(64)
  is_revoked      Boolean  @default(false)
  created_at      DateTime @default(now()) @db.Timestamptz()
  expires_at      DateTime @db.Timestamptz()
  last_used_at    DateTime @default(now()) @db.Timestamptz()

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, is_revoked])
  @@index([token_family])
  @@index([expires_at])
}

model Team {
  id             String       @id @default(uuid()) @db.Uuid
  leader_id      String       @unique @db.Uuid
  name           String?      @db.VarChar(200)
  referral_code  String       @unique @db.VarChar(20)
  member_count   Int          @default(0)
  team_value     Int          @default(0) // paise — sum of members' investments
  created_at     DateTime     @default(now()) @db.Timestamptz()
  updated_at     DateTime     @updatedAt @db.Timestamptz()

  leader  User         @relation("TeamLeader", fields: [leader_id], references: [id])
  members TeamMember[]

  @@index([referral_code])
}

model TeamMember {
  id        String   @id @default(uuid()) @db.Uuid
  team_id   String   @db.Uuid
  user_id   String   @db.Uuid
  joined_at DateTime @default(now()) @db.Timestamptz()

  team Team @relation(fields: [team_id], references: [id])
  user User @relation(fields: [user_id], references: [id])

  @@unique([team_id, user_id])
  @@index([team_id])
  @@index([user_id])
}

model Wallet {
  id           String        @id @default(uuid()) @db.Uuid
  user_id      String        @unique @db.Uuid
  balance      Int           @default(0)  // paise — DB CHECK >= 0
  created_at   DateTime      @default(now()) @db.Timestamptz()
  updated_at   DateTime      @updatedAt @db.Timestamptz()

  user         User          @relation(fields: [user_id], references: [id])
  transactions Transaction[]

  @@index([user_id])
}

model Transaction {
  id               String            @id @default(uuid()) @db.Uuid
  wallet_id        String            @db.Uuid
  type             TransactionType
  amount           Int               // paise — DB CHECK > 0
  balance_before   Int               // paise — snapshot
  balance_after    Int               // paise — snapshot
  status           TransactionStatus @default(PENDING)
  description      String?           @db.VarChar(500)
  reference_id     String?           @db.VarChar(100)  // Razorpay order/payment ID
  idempotency_key  String?           @db.VarChar(100)
  metadata         Json?             @db.JsonB

  created_at       DateTime          @default(now()) @db.Timestamptz()
  updated_at       DateTime          @updatedAt @db.Timestamptz()
  deleted_at       DateTime?         @db.Timestamptz()

  wallet Wallet @relation(fields: [wallet_id], references: [id])

  @@unique([wallet_id, idempotency_key])
  @@index([wallet_id])
  @@index([type])
  @@index([status])
  @@index([created_at])
}

model Project {
  id                String        @id @default(uuid()) @db.Uuid
  name              String        @db.VarChar(300)
  type              String        @db.VarChar(50)  // Land, Resort, Hotel, Farmhouse
  location          String        @db.VarChar(500)
  description       String?       @db.Text
  total_area_sqft   Int
  total_cost        Int           // paise
  estimated_value   Int           // paise
  status            ProjectStatus @default(PLANNED)
  completion_date   DateTime?     @db.Date
  gallery_urls      String[]      @default([])
  document_urls     String[]      @default([])

  // Legal tracking
  tsp_status        String?       @db.VarChar(50)
  rera_number       String?       @db.VarChar(100)

  created_at        DateTime      @default(now()) @db.Timestamptz()
  updated_at        DateTime      @updatedAt @db.Timestamptz()
  deleted_at        DateTime?     @db.Timestamptz()

  plots       Plot[]
  investments Investment[]
  sales       Sale[]

  @@index([status])
}

model Plot {
  id             String     @id @default(uuid()) @db.Uuid
  project_id     String     @db.Uuid
  plot_number    String     @db.VarChar(50)
  size_sqft      Int
  type           PlotType
  facing         String?    @db.VarChar(50)
  road_width_ft  Int?
  price          Int        // paise
  status         PlotStatus @default(AVAILABLE)
  features       Json?      @db.JsonB

  created_at     DateTime   @default(now()) @db.Timestamptz()
  updated_at     DateTime   @updatedAt @db.Timestamptz()
  deleted_at     DateTime?  @db.Timestamptz()

  project     Project      @relation(fields: [project_id], references: [id])
  investments Investment[]
  holds       PlotHold[]
  sale        Sale?

  @@unique([project_id, plot_number])
  @@index([project_id])
  @@index([status])
}

model Investment {
  id             String   @id @default(uuid()) @db.Uuid
  user_id        String   @db.Uuid
  project_id     String   @db.Uuid
  plot_id        String?  @db.Uuid
  amount         Int      // paise — DB CHECK > 0
  is_reinvestment Boolean @default(false)
  source_profit_id String? @db.Uuid  // links back to profit distribution

  created_at     DateTime @default(now()) @db.Timestamptz()
  deleted_at     DateTime? @db.Timestamptz()

  user    User    @relation(fields: [user_id], references: [id])
  project Project @relation(fields: [project_id], references: [id])
  plot    Plot?   @relation(fields: [plot_id], references: [id])

  @@index([user_id])
  @@index([project_id])
  @@index([plot_id])
}

model PlotHold {
  id          String     @id @default(uuid()) @db.Uuid
  user_id     String     @db.Uuid
  plot_id     String     @db.Uuid
  status      HoldStatus @default(ACTIVE)
  held_at     DateTime   @default(now()) @db.Timestamptz()
  expires_at  DateTime   @db.Timestamptz()    // NEVER nullable
  released_at DateTime?  @db.Timestamptz()

  user User @relation(fields: [user_id], references: [id])
  plot Plot @relation(fields: [plot_id], references: [id])

  @@index([user_id])
  @@index([plot_id])
  @@index([status, expires_at])
}

model Sale {
  id                String            @id @default(uuid()) @db.Uuid
  plot_id           String            @unique @db.Uuid
  project_id        String            @db.Uuid
  buyer_name        String            @db.VarChar(200)
  buyer_email       String?           @db.VarChar(255)
  buyer_mobile      String            @db.VarChar(15)
  buyer_pan         String?           @db.VarChar(500)  // encrypted
  buyer_aadhaar     String?           @db.VarChar(500)  // encrypted
  base_price        Int               // paise
  negotiated_price  Int               // paise
  final_price       Int               // paise
  payment_status    SalePaymentStatus @default(PENDING)
  is_distributed    Boolean           @default(false)
  invoice_url       String?           @db.VarChar(500)
  initiated_by      String            @db.Uuid  // admin user ID

  created_at        DateTime          @default(now()) @db.Timestamptz()
  updated_at        DateTime          @updatedAt @db.Timestamptz()
  deleted_at        DateTime?         @db.Timestamptz()

  plot         Plot                 @relation(fields: [plot_id], references: [id])
  project      Project              @relation(fields: [project_id], references: [id])
  distributions ProfitDistribution[]

  @@index([project_id])
  @@index([payment_status])
}

model ProfitDistribution {
  id               String             @id @default(uuid()) @db.Uuid
  sale_id          String             @db.Uuid
  user_id          String             @db.Uuid
  investment_amount Int               // paise — user's share of total
  total_invested   Int                // paise — total project investment
  gross_profit     Int                // paise
  company_share    Int                // paise
  investor_pool    Int                // paise
  user_profit      Int                // paise — credited to wallet
  status           DistributionStatus @default(PENDING)

  created_at       DateTime           @default(now()) @db.Timestamptz()

  sale Sale @relation(fields: [sale_id], references: [id])
  user User @relation(fields: [user_id], references: [id])

  @@unique([sale_id, user_id]) // prevent double-credit
  @@index([sale_id])
  @@index([user_id])
}

model Referral {
  id          String   @id @default(uuid()) @db.Uuid
  referrer_id String   @db.Uuid
  referee_id  String   @db.Uuid
  bonus_paise Int      @default(0)   // one-time fixed bonus
  is_paid     Boolean  @default(false)
  created_at  DateTime @default(now()) @db.Timestamptz()

  referrer User @relation("Referrer", fields: [referrer_id], references: [id])
  referee  User @relation("Referee", fields: [referee_id], references: [id])

  @@unique([referrer_id, referee_id])
  @@index([referrer_id])
}

model AuditLog {
  id              String   @id @default(uuid()) @db.Uuid
  event_type      String   @db.VarChar(100)
  actor_id        String?  @db.Uuid
  actor_role      String?  @db.VarChar(50)
  target_type     String?  @db.VarChar(50)
  target_id       String?  @db.Uuid
  ip_address      String?  @db.VarChar(45)
  user_agent_hash String?  @db.VarChar(64)
  payload         Json?    @db.JsonB
  result          String   @db.VarChar(20) // SUCCESS | FAILURE
  failure_reason  String?  @db.VarChar(500)
  created_at      DateTime @default(now()) @db.Timestamptz()

  // NO update/delete — append-only
  @@index([event_type])
  @@index([actor_id])
  @@index([created_at])
}

model IdempotencyKey {
  id           String   @id @default(uuid()) @db.Uuid
  user_id      String   @db.Uuid
  key          String   @db.VarChar(100)
  payload_hash String   @db.VarChar(64)
  response     Json     @db.JsonB
  status_code  Int
  created_at   DateTime @default(now()) @db.Timestamptz()
  expires_at   DateTime @db.Timestamptz()

  @@unique([user_id, key])
  @@index([expires_at])
}

model SystemConfig {
  id          String   @id @default(uuid()) @db.Uuid
  key         String   @unique @db.VarChar(100)
  value       String   @db.Text
  description String?  @db.VarChar(500)
  updated_by  String?  @db.Uuid
  updated_at  DateTime @updatedAt @db.Timestamptz()

  @@index([key])
}
```

## Migration Notes — DB Check Constraints (raw SQL)

```sql
-- Run alongside Prisma migration
ALTER TABLE wallets ADD CONSTRAINT wallet_balance_non_negative CHECK (balance >= 0);
ALTER TABLE transactions ADD CONSTRAINT transaction_amount_positive CHECK (amount > 0);
ALTER TABLE investments ADD CONSTRAINT investment_amount_positive CHECK (amount > 0);

-- Audit log: revoke UPDATE/DELETE from app user
REVOKE UPDATE, DELETE ON audit_logs FROM app_rw;
GRANT INSERT ON audit_logs TO app_audit;

-- RLS policies
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY wallet_owner ON wallets FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);
-- Similar for users, investments, transactions
```
