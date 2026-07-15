
-- CreateEnum
CREATE TYPE "DeskChannel" AS ENUM ('PHONE', 'EMAIL', 'CHAT', 'WALKIN');

-- CreateEnum
CREATE TYPE "DeskTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "DeskTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" SERIAL NOT NULL,
    "channel" "DeskChannel" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DeskTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "IncidentUrgency" NOT NULL DEFAULT 'MEDIUM',
    "requesterName" TEXT NOT NULL,
    "requesterContact" TEXT,
    "vehicleId" TEXT,
    "linkedIncidentId" TEXT,
    "linkedJornadaId" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DeskTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeskTicketNote" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeskTicketNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeskTicket_ticketNumber_key" ON "DeskTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "DeskTicket_status_idx" ON "DeskTicket"("status");

-- CreateIndex
CREATE INDEX "DeskTicket_vehicleId_idx" ON "DeskTicket"("vehicleId");

-- CreateIndex
CREATE INDEX "DeskTicket_linkedIncidentId_idx" ON "DeskTicket"("linkedIncidentId");

-- CreateIndex
CREATE INDEX "DeskTicketNote_ticketId_createdAt_idx" ON "DeskTicketNote"("ticketId", "createdAt");

-- AddForeignKey
ALTER TABLE "DeskTicket" ADD CONSTRAINT "DeskTicket_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeskTicket" ADD CONSTRAINT "DeskTicket_linkedIncidentId_fkey" FOREIGN KEY ("linkedIncidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeskTicket" ADD CONSTRAINT "DeskTicket_linkedJornadaId_fkey" FOREIGN KEY ("linkedJornadaId") REFERENCES "JornadaOperativa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeskTicket" ADD CONSTRAINT "DeskTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeskTicket" ADD CONSTRAINT "DeskTicket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeskTicketNote" ADD CONSTRAINT "DeskTicketNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "DeskTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeskTicketNote" ADD CONSTRAINT "DeskTicketNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

