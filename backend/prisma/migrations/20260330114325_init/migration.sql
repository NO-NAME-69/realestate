-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'SUSPENDED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('INVESTOR', 'TEAM_LEADER', 'FINANCE_MANAGER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('REGISTRATION_FEE', 'WALLET_TOPUP', 'INVESTMENT_DEBIT', 'PROFIT_CREDIT', 'WITHDRAWAL', 'REFUND', 'ADMIN_CREDIT', 'ADMIN_DEBIT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNED', 'LAND_ACQUIRED', 'LEGAL_IN_PROGRESS', 'APPROVED', 'UNDER_DEVELOPMENT', 'READY_FOR_SALE', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PlotStatus" AS ENUM ('AVAILABLE', 'HELD', 'RESERVED', 'SOLD');

-- CreateEnum
CREATE TYPE "PlotType" AS ENUM ('CORNER', 'MIDDLE', 'DOUBLE_ROAD');

-- CreateEnum
CREATE TYPE "SalePaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED');

-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('ACTIVE', 'RELEASED_MANUAL', 'RELEASED_EXPIRED', 'RELEASED_ADMIN', 'CONVERTED_TO_SALE');

-- CreateEnum
CREATE TYPE "DistributionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'ROLLED_BACK');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "mobile" VARCHAR(15) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "address" VARCHAR(500),
    "date_of_birth" DATE,
    "occupation" VARCHAR(100),
    "profile_photo_url" VARCHAR(500),
    "pan_number" VARCHAR(500),
    "aadhaar_number" VARCHAR(500),
    "bank_account_number" VARCHAR(500),
    "bank_ifsc" VARCHAR(500),
    "upi_id" VARCHAR(500),
    "status" "UserStatus" NOT NULL DEFAULT 'INACTIVE',
    "role" "UserRole" NOT NULL DEFAULT 'INVESTOR',
    "is_mobile_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "activation_reason" VARCHAR(50),
    "total_investment" INTEGER NOT NULL DEFAULT 0,
    "password_history" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_family" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent_hash" VARCHAR(64) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "last_used_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "leader_id" UUID NOT NULL,
    "name" VARCHAR(200),
    "referral_code" VARCHAR(20) NOT NULL,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "team_value" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "description" VARCHAR(500),
    "reference_id" VARCHAR(100),
    "idempotency_key" VARCHAR(100),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "location" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "total_area_sqft" INTEGER NOT NULL,
    "total_cost" INTEGER NOT NULL,
    "estimated_value" INTEGER NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNED',
    "completion_date" DATE,
    "gallery_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "document_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tsp_status" VARCHAR(50),
    "rera_number" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plots" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "plot_number" VARCHAR(50) NOT NULL,
    "size_sqft" INTEGER NOT NULL,
    "type" "PlotType" NOT NULL,
    "facing" VARCHAR(50),
    "road_width_ft" INTEGER,
    "price" INTEGER NOT NULL,
    "status" "PlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "features" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "plots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "plot_id" UUID,
    "amount" INTEGER NOT NULL,
    "is_reinvestment" BOOLEAN NOT NULL DEFAULT false,
    "source_profit_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plot_holds" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plot_id" UUID NOT NULL,
    "status" "HoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "held_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "released_at" TIMESTAMPTZ,

    CONSTRAINT "plot_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "plot_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "buyer_name" VARCHAR(200) NOT NULL,
    "buyer_email" VARCHAR(255),
    "buyer_mobile" VARCHAR(15) NOT NULL,
    "buyer_pan" VARCHAR(500),
    "buyer_aadhaar" VARCHAR(500),
    "base_price" INTEGER NOT NULL,
    "negotiated_price" INTEGER NOT NULL,
    "final_price" INTEGER NOT NULL,
    "payment_status" "SalePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "is_distributed" BOOLEAN NOT NULL DEFAULT false,
    "invoice_url" VARCHAR(500),
    "initiated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_distributions" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "investment_amount" INTEGER NOT NULL,
    "total_invested" INTEGER NOT NULL,
    "gross_profit" INTEGER NOT NULL,
    "company_share" INTEGER NOT NULL,
    "investor_pool" INTEGER NOT NULL,
    "user_profit" INTEGER NOT NULL,
    "status" "DistributionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profit_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "referee_id" UUID NOT NULL,
    "bonus_paise" INTEGER NOT NULL DEFAULT 0,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "actor_id" UUID,
    "actor_role" VARCHAR(50),
    "target_type" VARCHAR(50),
    "target_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent_hash" VARCHAR(64),
    "payload" JSONB,
    "result" VARCHAR(20) NOT NULL,
    "failure_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "response" JSONB NOT NULL,
    "status_code" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "description" VARCHAR(500),
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_mobile_idx" ON "users"("mobile");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_is_revoked_idx" ON "user_sessions"("user_id", "is_revoked");

-- CreateIndex
CREATE INDEX "user_sessions_token_family_idx" ON "user_sessions"("token_family");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "teams_leader_id_key" ON "teams"("leader_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_referral_code_key" ON "teams"("referral_code");

-- CreateIndex
CREATE INDEX "teams_referral_code_idx" ON "teams"("referral_code");

-- CreateIndex
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");

-- CreateIndex
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "wallets_user_id_idx" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "transactions_wallet_id_idx" ON "transactions"("wallet_id");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_wallet_id_idempotency_key_key" ON "transactions"("wallet_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "plots_project_id_idx" ON "plots"("project_id");

-- CreateIndex
CREATE INDEX "plots_status_idx" ON "plots"("status");

-- CreateIndex
CREATE UNIQUE INDEX "plots_project_id_plot_number_key" ON "plots"("project_id", "plot_number");

-- CreateIndex
CREATE INDEX "investments_user_id_idx" ON "investments"("user_id");

-- CreateIndex
CREATE INDEX "investments_project_id_idx" ON "investments"("project_id");

-- CreateIndex
CREATE INDEX "investments_plot_id_idx" ON "investments"("plot_id");

-- CreateIndex
CREATE INDEX "plot_holds_user_id_idx" ON "plot_holds"("user_id");

-- CreateIndex
CREATE INDEX "plot_holds_plot_id_idx" ON "plot_holds"("plot_id");

-- CreateIndex
CREATE INDEX "plot_holds_status_expires_at_idx" ON "plot_holds"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_plot_id_key" ON "sales"("plot_id");

-- CreateIndex
CREATE INDEX "sales_project_id_idx" ON "sales"("project_id");

-- CreateIndex
CREATE INDEX "sales_payment_status_idx" ON "sales"("payment_status");

-- CreateIndex
CREATE INDEX "profit_distributions_sale_id_idx" ON "profit_distributions"("sale_id");

-- CreateIndex
CREATE INDEX "profit_distributions_user_id_idx" ON "profit_distributions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profit_distributions_sale_id_user_id_key" ON "profit_distributions"("sale_id", "user_id");

-- CreateIndex
CREATE INDEX "referrals_referrer_id_idx" ON "referrals"("referrer_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referrer_id_referee_id_key" ON "referrals"("referrer_id", "referee_id");

-- CreateIndex
CREATE INDEX "audit_logs_event_type_idx" ON "audit_logs"("event_type");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_user_id_key_key" ON "idempotency_keys"("user_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- CreateIndex
CREATE INDEX "system_configs_key_idx" ON "system_configs"("key");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plots" ADD CONSTRAINT "plots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_plot_id_fkey" FOREIGN KEY ("plot_id") REFERENCES "plots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plot_holds" ADD CONSTRAINT "plot_holds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plot_holds" ADD CONSTRAINT "plot_holds_plot_id_fkey" FOREIGN KEY ("plot_id") REFERENCES "plots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_plot_id_fkey" FOREIGN KEY ("plot_id") REFERENCES "plots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_distributions" ADD CONSTRAINT "profit_distributions_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_distributions" ADD CONSTRAINT "profit_distributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
