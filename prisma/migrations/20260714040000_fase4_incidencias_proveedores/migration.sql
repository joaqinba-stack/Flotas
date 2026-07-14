-- CreateEnum
CREATE TYPE "IncidentUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_SUPPLIER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('SENT', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "code" SERIAL NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "jornadaId" TEXT,
    "driverId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "urgency" "IncidentUrgency" NOT NULL DEFAULT 'MEDIUM',
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "reportedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentNote" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentAttachment" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierServiceOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" SERIAL NOT NULL,
    "supplierId" TEXT NOT NULL,
    "incidentId" TEXT,
    "vehicleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'SENT',
    "costEstimate" DECIMAL(12,2),
    "costFinal" DECIMAL(12,2),
    "scheduledFor" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierServiceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierServiceOrderNote" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierServiceOrderNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Incident_code_key" ON "Incident"("code");

-- CreateIndex
CREATE INDEX "Incident_vehicleId_occurredAt_idx" ON "Incident"("vehicleId", "occurredAt");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_driverId_idx" ON "Incident"("driverId");

-- CreateIndex
CREATE INDEX "IncidentNote_incidentId_createdAt_idx" ON "IncidentNote"("incidentId", "createdAt");

-- CreateIndex
CREATE INDEX "IncidentAttachment_incidentId_idx" ON "IncidentAttachment"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierServiceOrder_orderNumber_key" ON "SupplierServiceOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "SupplierServiceOrder_supplierId_status_idx" ON "SupplierServiceOrder"("supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierServiceOrder_vehicleId_idx" ON "SupplierServiceOrder"("vehicleId");

-- CreateIndex
CREATE INDEX "SupplierServiceOrder_incidentId_idx" ON "SupplierServiceOrder"("incidentId");

-- CreateIndex
CREATE INDEX "SupplierServiceOrderNote_orderId_createdAt_idx" ON "SupplierServiceOrderNote"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "JornadaOperativa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentNote" ADD CONSTRAINT "IncidentNote_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentNote" ADD CONSTRAINT "IncidentNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAttachment" ADD CONSTRAINT "IncidentAttachment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAttachment" ADD CONSTRAINT "IncidentAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierServiceOrder" ADD CONSTRAINT "SupplierServiceOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierServiceOrder" ADD CONSTRAINT "SupplierServiceOrder_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierServiceOrder" ADD CONSTRAINT "SupplierServiceOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierServiceOrder" ADD CONSTRAINT "SupplierServiceOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierServiceOrderNote" ADD CONSTRAINT "SupplierServiceOrderNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SupplierServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierServiceOrderNote" ADD CONSTRAINT "SupplierServiceOrderNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

