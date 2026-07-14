-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'IN_MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('NAFTA', 'DIESEL', 'GNC', 'ELECTRICO');

-- CreateEnum
CREATE TYPE "DeviceConnectionStatus" AS ENUM ('ONLINE', 'OFFLINE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "tankCapacityLiters" DECIMAL(6,1),
    "odometerKm" INTEGER NOT NULL DEFAULT 0,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "orgUnitId" TEXT NOT NULL,
    "currentDriverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleStatusHistory" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fromStatus" "VehicleStatus",
    "toStatus" "VehicleStatus" NOT NULL,
    "reason" TEXT,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraccarDevice" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "traccarId" INTEGER,
    "uniqueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monitoringIntervalSeconds" INTEGER NOT NULL DEFAULT 60,
    "connectionStatus" "DeviceConnectionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraccarDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionSnapshot" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "traccarPositionId" BIGINT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speedKmh" DOUBLE PRECISION NOT NULL,
    "course" DOUBLE PRECISION,
    "ignition" BOOLEAN,
    "odometerKm" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBuffered" BOOLEAN NOT NULL DEFAULT false,
    "attributes" JSONB,

    CONSTRAINT "PositionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "Vehicle_orgUnitId_idx" ON "Vehicle"("orgUnitId");

-- CreateIndex
CREATE INDEX "Vehicle_currentDriverId_idx" ON "Vehicle"("currentDriverId");

-- CreateIndex
CREATE INDEX "VehicleStatusHistory_vehicleId_createdAt_idx" ON "VehicleStatusHistory"("vehicleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TraccarDevice_vehicleId_key" ON "TraccarDevice"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "TraccarDevice_traccarId_key" ON "TraccarDevice"("traccarId");

-- CreateIndex
CREATE UNIQUE INDEX "TraccarDevice_uniqueId_key" ON "TraccarDevice"("uniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "PositionSnapshot_traccarPositionId_key" ON "PositionSnapshot"("traccarPositionId");

-- CreateIndex
CREATE INDEX "PositionSnapshot_vehicleId_recordedAt_idx" ON "PositionSnapshot"("vehicleId", "recordedAt");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_currentDriverId_fkey" FOREIGN KEY ("currentDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStatusHistory" ADD CONSTRAINT "VehicleStatusHistory_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStatusHistory" ADD CONSTRAINT "VehicleStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraccarDevice" ADD CONSTRAINT "TraccarDevice_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionSnapshot" ADD CONSTRAINT "PositionSnapshot_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

