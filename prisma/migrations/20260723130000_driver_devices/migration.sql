-- CreateTable
CREATE TABLE "DriverDevice" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "traccarId" INTEGER,
    "uniqueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monitoringIntervalSeconds" INTEGER NOT NULL DEFAULT 60,
    "connectionStatus" "DeviceConnectionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverPositionSnapshot" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "traccarPositionId" BIGINT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speedKmh" DOUBLE PRECISION NOT NULL,
    "course" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBuffered" BOOLEAN NOT NULL DEFAULT false,
    "attributes" JSONB,

    CONSTRAINT "DriverPositionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverDevice_driverId_key" ON "DriverDevice"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverDevice_traccarId_key" ON "DriverDevice"("traccarId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverDevice_uniqueId_key" ON "DriverDevice"("uniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverPositionSnapshot_traccarPositionId_key" ON "DriverPositionSnapshot"("traccarPositionId");

-- CreateIndex
CREATE INDEX "DriverPositionSnapshot_driverId_recordedAt_idx" ON "DriverPositionSnapshot"("driverId", "recordedAt");

-- AddForeignKey
ALTER TABLE "DriverDevice" ADD CONSTRAINT "DriverDevice_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverPositionSnapshot" ADD CONSTRAINT "DriverPositionSnapshot_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
