-- CreateEnum
CREATE TYPE "BoqUnit" AS ENUM ('M', 'M2', 'M3', 'ITEM', 'LOT');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('MATERIAL', 'LABOR', 'TRANSPORT', 'EQUIPMENT', 'SUBCONTRACTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancialRecordStatus" AS ENUM ('ACTIVE', 'VOID');

-- CreateEnum
CREATE TYPE "FinancialAttachmentKind" AS ENUM ('EXPENSE', 'CLIENT_PAYMENT', 'CONTRACTOR_PAYMENT');

-- CreateTable
CREATE TABLE "ProjectFinancialProfile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "contractValueMinor" INTEGER,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectFinancialProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostEstimate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CostEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostEstimateItem" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" "BoqUnit" NOT NULL,
    "quantityMilli" INTEGER NOT NULL,
    "unitRateMinor" INTEGER NOT NULL,
    "lineTotalMinor" INTEGER NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CostEstimateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOQItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "section" TEXT,
    "description" TEXT NOT NULL,
    "unit" "BoqUnit" NOT NULL,
    "quantityMilli" INTEGER NOT NULL,
    "unitRateMinor" INTEGER NOT NULL,
    "lineTotalMinor" INTEGER NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BOQItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "vendor" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "status" "FinancialRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPayment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "status" "FinancialRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorPayment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "payee" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "category" "ExpenseCategory",
    "reference" TEXT,
    "description" TEXT,
    "status" "FinancialRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContractorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAttachment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "FinancialAttachmentKind" NOT NULL,
    "expenseId" TEXT,
    "clientPaymentId" TEXT,
    "contractorPaymentId" TEXT,
    "storagePath" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFinancialProfile_projectId_key" ON "ProjectFinancialProfile"("projectId");
CREATE INDEX "CostEstimate_projectId_isCurrent_idx" ON "CostEstimate"("projectId", "isCurrent");
CREATE INDEX "CostEstimate_projectId_version_idx" ON "CostEstimate"("projectId", "version");
CREATE INDEX "CostEstimateItem_estimateId_sortOrder_idx" ON "CostEstimateItem"("estimateId", "sortOrder");
CREATE INDEX "BOQItem_projectId_sortOrder_idx" ON "BOQItem"("projectId", "sortOrder");
CREATE INDEX "BOQItem_projectId_section_idx" ON "BOQItem"("projectId", "section");
CREATE INDEX "Expense_projectId_expenseDate_idx" ON "Expense"("projectId", "expenseDate");
CREATE INDEX "Expense_projectId_category_idx" ON "Expense"("projectId", "category");
CREATE INDEX "Expense_projectId_status_idx" ON "Expense"("projectId", "status");
CREATE INDEX "ClientPayment_projectId_paymentDate_idx" ON "ClientPayment"("projectId", "paymentDate");
CREATE INDEX "ClientPayment_projectId_status_idx" ON "ClientPayment"("projectId", "status");
CREATE INDEX "ContractorPayment_projectId_paymentDate_idx" ON "ContractorPayment"("projectId", "paymentDate");
CREATE INDEX "ContractorPayment_projectId_status_idx" ON "ContractorPayment"("projectId", "status");
CREATE INDEX "FinancialAttachment_projectId_idx" ON "FinancialAttachment"("projectId");
CREATE INDEX "FinancialAttachment_expenseId_idx" ON "FinancialAttachment"("expenseId");
CREATE INDEX "FinancialAttachment_clientPaymentId_idx" ON "FinancialAttachment"("clientPaymentId");
CREATE INDEX "FinancialAttachment_contractorPaymentId_idx" ON "FinancialAttachment"("contractorPaymentId");

-- AddForeignKey
ALTER TABLE "ProjectFinancialProfile" ADD CONSTRAINT "ProjectFinancialProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectFinancialProfile" ADD CONSTRAINT "ProjectFinancialProfile_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CostEstimate" ADD CONSTRAINT "CostEstimate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CostEstimate" ADD CONSTRAINT "CostEstimate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CostEstimateItem" ADD CONSTRAINT "CostEstimateItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "CostEstimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BOQItem" ADD CONSTRAINT "BOQItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BOQItem" ADD CONSTRAINT "BOQItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractorPayment" ADD CONSTRAINT "ContractorPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractorPayment" ADD CONSTRAINT "ContractorPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialAttachment" ADD CONSTRAINT "FinancialAttachment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAttachment" ADD CONSTRAINT "FinancialAttachment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAttachment" ADD CONSTRAINT "FinancialAttachment_clientPaymentId_fkey" FOREIGN KEY ("clientPaymentId") REFERENCES "ClientPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAttachment" ADD CONSTRAINT "FinancialAttachment_contractorPaymentId_fkey" FOREIGN KEY ("contractorPaymentId") REFERENCES "ContractorPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAttachment" ADD CONSTRAINT "FinancialAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
