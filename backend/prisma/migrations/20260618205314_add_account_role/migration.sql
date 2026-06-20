-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('PRIMARY', 'SECONDARY', 'BALANCE_ONLY');

-- AlterTable
ALTER TABLE "PlaidAccount" ADD COLUMN     "role" "AccountRole" NOT NULL DEFAULT 'SECONDARY';
