-- CreateEnum
CREATE TYPE "ViaticoStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "PermitStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PerformanceKind" AS ENUM ('COMMENDATION', 'SANCTION', 'TRAINING', 'OBSERVATION');

-- CreateTable
CREATE TABLE "Viatico" (
    "id" TEXT NOT NULL,
    "jornadaId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "ViaticoStatus" NOT NULL DEFAULT 'REQUESTED',
    "approvedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Viatico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permit" (
    "id" TEXT NOT NULL,
    "jornadaId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "PermitStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Novedad" (
    "id" TEXT NOT NULL,
    "jornadaId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reportedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Novedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverPerformanceRecord" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "kind" "PerformanceKind" NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "jornadaId" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverPerformanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Viatico_jornadaId_idx" ON "Viatico"("jornadaId");

-- CreateIndex
CREATE INDEX "Viatico_driverId_idx" ON "Viatico"("driverId");

-- CreateIndex
CREATE INDEX "Permit_jornadaId_idx" ON "Permit"("jornadaId");

-- CreateIndex
CREATE INDEX "Permit_driverId_idx" ON "Permit"("driverId");

-- CreateIndex
CREATE INDEX "Novedad_jornadaId_idx" ON "Novedad"("jornadaId");

-- CreateIndex
CREATE INDEX "DriverPerformanceRecord_driverId_createdAt_idx" ON "DriverPerformanceRecord"("driverId", "createdAt");

-- AddForeignKey
ALTER TABLE "Viatico" ADD CONSTRAINT "Viatico_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "JornadaOperativa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viatico" ADD CONSTRAINT "Viatico_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viatico" ADD CONSTRAINT "Viatico_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viatico" ADD CONSTRAINT "Viatico_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "JornadaOperativa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Novedad" ADD CONSTRAINT "Novedad_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "JornadaOperativa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Novedad" ADD CONSTRAINT "Novedad_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverPerformanceRecord" ADD CONSTRAINT "DriverPerformanceRecord_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverPerformanceRecord" ADD CONSTRAINT "DriverPerformanceRecord_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "JornadaOperativa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverPerformanceRecord" ADD CONSTRAINT "DriverPerformanceRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

