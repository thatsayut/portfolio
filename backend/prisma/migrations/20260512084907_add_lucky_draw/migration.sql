-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'LUCKY_DRAW';

-- CreateTable
CREATE TABLE "lucky_draw_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default Wheel',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "costPerSpin" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "maxSpinsPerDay" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lucky_draw_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lucky_draw_slots" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rewardAmount" DECIMAL(18,4) NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lucky_draw_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lucky_draw_histories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "rewardAmount" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lucky_draw_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lucky_draw_slots_configId_idx" ON "lucky_draw_slots"("configId");

-- CreateIndex
CREATE INDEX "lucky_draw_histories_userId_idx" ON "lucky_draw_histories"("userId");

-- CreateIndex
CREATE INDEX "lucky_draw_histories_createdAt_idx" ON "lucky_draw_histories"("createdAt");

-- AddForeignKey
ALTER TABLE "lucky_draw_slots" ADD CONSTRAINT "lucky_draw_slots_configId_fkey" FOREIGN KEY ("configId") REFERENCES "lucky_draw_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lucky_draw_histories" ADD CONSTRAINT "lucky_draw_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lucky_draw_histories" ADD CONSTRAINT "lucky_draw_histories_configId_fkey" FOREIGN KEY ("configId") REFERENCES "lucky_draw_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lucky_draw_histories" ADD CONSTRAINT "lucky_draw_histories_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "lucky_draw_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
