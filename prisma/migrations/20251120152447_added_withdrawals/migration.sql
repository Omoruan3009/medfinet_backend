-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING_SIGNATURE', 'PENDING_CONFIRMATION', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "withdrawnAmount" DOUBLE PRECISION,
ADD COLUMN     "withdrawnAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "campaign_withdrawals" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "recipientWallet" TEXT NOT NULL,
    "transactionHash" TEXT,
    "unsignedTransaction" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING_SIGNATURE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "campaign_withdrawals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "campaign_withdrawals" ADD CONSTRAINT "campaign_withdrawals_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
