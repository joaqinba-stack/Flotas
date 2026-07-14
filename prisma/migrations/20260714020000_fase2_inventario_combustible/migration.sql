-- CreateEnum
CREATE TYPE "JornadaStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FuelValidationStatus" AS ENUM ('PENDING', 'VALID', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TireStatus" AS ENUM ('IN_STOCK', 'MOUNTED', 'IN_REPAIR', 'DISCARDED');

-- CreateEnum
CREATE TYPE "TireMovementType" AS ENUM ('MOUNT', 'ROTATE', 'DISMOUNT', 'REPAIR', 'DISCARD');

-- CreateEnum
CREATE TYPE "AuxAssetStatus" AS ENUM ('IN_STOCK', 'ASSIGNED', 'IN_REPAIR', 'RETIRED');

-- CreateEnum
CREATE TYPE "AuxAssetMovementType" AS ENUM ('ASSIGN', 'RETURN', 'REPAIR', 'RETIRE');

-- CreateTable
CREATE TABLE "JornadaOperativa" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "plannedStart" TIMESTAMP(3) NOT NULL,
    "plannedEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "startOdometerKm" INTEGER,
    "endOdometerKm" INTEGER,
    "status" "JornadaStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JornadaOperativa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelLoad" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "jornadaId" TEXT,
    "loadedAt" TIMESTAMP(3) NOT NULL,
    "liters" DECIMAL(7,2) NOT NULL,
    "pricePerLiter" DECIMAL(10,2),
    "totalCost" DECIMAL(12,2),
    "odometerKm" INTEGER NOT NULL,
    "station" TEXT,
    "fuelType" "FuelType" NOT NULL,
    "validationStatus" "FuelValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validationFlags" TEXT[],
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelLoad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tire" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "status" "TireStatus" NOT NULL DEFAULT 'IN_STOCK',
    "currentVehicleId" TEXT,
    "currentPosition" TEXT,
    "treadDepthMm" DECIMAL(4,1),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TireMovement" (
    "id" TEXT NOT NULL,
    "tireId" TEXT NOT NULL,
    "type" "TireMovementType" NOT NULL,
    "vehicleId" TEXT,
    "fromPosition" TEXT,
    "toPosition" TEXT,
    "odometerKm" INTEGER,
    "notes" TEXT,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TireMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuxiliaryAsset" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "AuxAssetStatus" NOT NULL DEFAULT 'IN_STOCK',
    "currentVehicleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuxiliaryAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuxiliaryAssetMovement" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "AuxAssetMovementType" NOT NULL,
    "vehicleId" TEXT,
    "notes" TEXT,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuxiliaryAssetMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JornadaOperativa_vehicleId_plannedStart_idx" ON "JornadaOperativa"("vehicleId", "plannedStart");

-- CreateIndex
CREATE INDEX "JornadaOperativa_driverId_plannedStart_idx" ON "JornadaOperativa"("driverId", "plannedStart");

-- CreateIndex
CREATE INDEX "JornadaOperativa_orgUnitId_idx" ON "JornadaOperativa"("orgUnitId");

-- CreateIndex
CREATE INDEX "JornadaOperativa_status_idx" ON "JornadaOperativa"("status");

-- CreateIndex
CREATE INDEX "FuelLoad_vehicleId_loadedAt_idx" ON "FuelLoad"("vehicleId", "loadedAt");

-- CreateIndex
CREATE INDEX "FuelLoad_validationStatus_idx" ON "FuelLoad"("validationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Tire_serialNumber_key" ON "Tire"("serialNumber");

-- CreateIndex
CREATE INDEX "Tire_currentVehicleId_idx" ON "Tire"("currentVehicleId");

-- CreateIndex
CREATE INDEX "TireMovement_tireId_createdAt_idx" ON "TireMovement"("tireId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuxiliaryAsset_code_key" ON "AuxiliaryAsset"("code");

-- CreateIndex
CREATE INDEX "AuxiliaryAsset_currentVehicleId_idx" ON "AuxiliaryAsset"("currentVehicleId");

-- CreateIndex
CREATE INDEX "AuxiliaryAssetMovement_assetId_createdAt_idx" ON "AuxiliaryAssetMovement"("assetId", "createdAt");

-- AddForeignKey
ALTER TABLE "JornadaOperativa" ADD CONSTRAINT "JornadaOperativa_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JornadaOperativa" ADD CONSTRAINT "JornadaOperativa_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JornadaOperativa" ADD CONSTRAINT "JornadaOperativa_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JornadaOperativa" ADD CONSTRAINT "JornadaOperativa_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLoad" ADD CONSTRAINT "FuelLoad_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLoad" ADD CONSTRAINT "FuelLoad_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLoad" ADD CONSTRAINT "FuelLoad_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "JornadaOperativa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLoad" ADD CONSTRAINT "FuelLoad_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLoad" ADD CONSTRAINT "FuelLoad_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tire" ADD CONSTRAINT "Tire_currentVehicleId_fkey" FOREIGN KEY ("currentVehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TireMovement" ADD CONSTRAINT "TireMovement_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "Tire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TireMovement" ADD CONSTRAINT "TireMovement_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TireMovement" ADD CONSTRAINT "TireMovement_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuxiliaryAsset" ADD CONSTRAINT "AuxiliaryAsset_currentVehicleId_fkey" FOREIGN KEY ("currentVehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuxiliaryAssetMovement" ADD CONSTRAINT "AuxiliaryAssetMovement_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "AuxiliaryAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuxiliaryAssetMovement" ADD CONSTRAINT "AuxiliaryAssetMovement_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuxiliaryAssetMovement" ADD CONSTRAINT "AuxiliaryAssetMovement_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

