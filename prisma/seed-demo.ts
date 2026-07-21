/**
 * Seed DEMO — dataset completo y realista para recorrer todos los módulos.
 *
 * A diferencia de `seed.ts` (solo crea la cuenta admin, pensado para una
 * instalación limpia de producción), este seed puebla el sistema entero:
 * organigrama de 3 niveles, un usuario por rol, flota con dispositivos y
 * posiciones, jornadas con viáticos/permisos/novedades, combustible pasando
 * por el motor de validación real, neumáticos, activos, incidencias, órdenes a
 * proveedores, geocercas, alertas, reportes, tickets de mesa y catálogos.
 *
 * Es idempotente: borra todo el dataset y lo vuelve a crear desde cero.
 *
 *   npm run db:seed:demo
 */
import {
  PrismaClient,
  Role,
  OrgUnitKind,
  DriverStatus,
  VehicleStatus,
  FuelType,
  DeviceConnectionStatus,
  JornadaStatus,
  ViaticoStatus,
  PermitStatus,
  PerformanceKind,
  FuelValidationStatus,
  TireStatus,
  TireMovementType,
  AuxAssetStatus,
  AuxAssetMovementType,
  IncidentUrgency,
  IncidentStatus,
  ServiceOrderStatus,
  AlertType,
  AlertSeverity,
  AlertStatus,
  NotificationChannel,
  NotificationStatus,
  ReportDataset,
  ReportFormat,
  ReportRunStatus,
  DeskChannel,
  DeskTicketStatus,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import { validateFuelLoad } from "../lib/validation/fuel-load-rules";

const prisma = new PrismaClient();

const now = new Date();
function daysAgo(d: number): Date {
  return new Date(now.getTime() - d * 24 * 3600 * 1000);
}
function hoursAgo(h: number): Date {
  return new Date(now.getTime() - h * 3600 * 1000);
}
function daysAhead(d: number): Date {
  return new Date(now.getTime() + d * 24 * 3600 * 1000);
}

// Borra todo en orden seguro respecto de las FK (hijos antes que padres).
async function resetAll() {
  await prisma.alertNotificationLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.reportRun.deleteMany();
  await prisma.reportDefinition.deleteMany();
  await prisma.deskTicketNote.deleteMany();
  await prisma.deskTicket.deleteMany();
  await prisma.supplierServiceOrderNote.deleteMany();
  await prisma.supplierServiceOrder.deleteMany();
  await prisma.incidentAttachment.deleteMany();
  await prisma.incidentNote.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.auxiliaryAssetMovement.deleteMany();
  await prisma.auxiliaryAsset.deleteMany();
  await prisma.tireMovement.deleteMany();
  await prisma.tire.deleteMany();
  await prisma.driverPerformanceRecord.deleteMany();
  await prisma.novedad.deleteMany();
  await prisma.permit.deleteMany();
  await prisma.viatico.deleteMany();
  await prisma.fuelLoad.deleteMany();
  await prisma.positionSnapshot.deleteMany();
  await prisma.jornadaOperativa.deleteMany();
  await prisma.geofence.deleteMany();
  await prisma.vehicleStatusHistory.deleteMany();
  await prisma.traccarDevice.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  // Desligar FKs de User antes de borrar
  await prisma.vehicle.updateMany({ data: { currentDriverId: null } });
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.orgUnit.deleteMany();
  await prisma.catalogItem.deleteMany();
}

async function main() {
  console.log("[seed:demo] limpiando dataset previo…");
  await resetAll();

  const password = await hash(process.env.SEED_PASSWORD ?? "flotas123", 10);

  // ---------------------------------------------------------------------------
  // 1. Organigrama (materialized path: "/<rootId>/<childId>/…")
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] organigrama…");
  const direccionId = randomUUID();
  const direccion = await prisma.orgUnit.create({
    data: { id: direccionId, name: "Dirección General de Flota", kind: OrgUnitKind.DIRECCION, path: `/${direccionId}/` },
  });

  const opsId = randomUUID();
  const operaciones = await prisma.orgUnit.create({
    data: {
      id: opsId,
      name: "Departamento de Operaciones",
      kind: OrgUnitKind.DEPARTAMENTO,
      parentId: direccion.id,
      path: `/${direccionId}/${opsId}/`,
    },
  });

  const mantId = randomUUID();
  await prisma.orgUnit.create({
    data: {
      id: mantId,
      name: "Departamento de Mantenimiento",
      kind: OrgUnitKind.DEPARTAMENTO,
      parentId: direccion.id,
      path: `/${direccionId}/${mantId}/`,
    },
  });

  const norteId = randomUUID();
  const baseNorte = await prisma.orgUnit.create({
    data: {
      id: norteId,
      name: "Base Logística Norte",
      kind: OrgUnitKind.BASE_LOGISTICA,
      parentId: operaciones.id,
      path: `/${direccionId}/${opsId}/${norteId}/`,
    },
  });

  const surId = randomUUID();
  const baseSur = await prisma.orgUnit.create({
    data: {
      id: surId,
      name: "Base Logística Sur",
      kind: OrgUnitKind.BASE_LOGISTICA,
      parentId: operaciones.id,
      path: `/${direccionId}/${opsId}/${surId}/`,
    },
  });

  // ---------------------------------------------------------------------------
  // 2. Proveedores
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] proveedores…");
  const tallerCentral = await prisma.supplier.create({
    data: {
      name: "Taller Mecánico Central S.R.L.",
      taxId: "30-71234567-9",
      serviceTypes: "Mecánica general, chapa y pintura",
      contactName: "Roberto Giménez",
      contactEmail: "contacto@tallercentral.com.ar",
      contactPhone: "+54 11 4555-1000",
      active: true,
    },
  });
  const gomeria = await prisma.supplier.create({
    data: {
      name: "Gomería del Sur",
      taxId: "30-70999888-1",
      serviceTypes: "Neumáticos, alineación y balanceo",
      contactName: "Marta Ríos",
      contactEmail: "ventas@gomeriadelsur.com.ar",
      contactPhone: "+54 11 4666-2000",
      active: true,
    },
  });

  // ---------------------------------------------------------------------------
  // 3. Conductores
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] conductores…");
  const driverJuan = await prisma.driver.create({
    data: {
      firstName: "Juan", lastName: "Pérez", documentId: "28345678", licenseNumber: "B-28345678",
      licenseCategory: "D2", licenseExpiry: daysAhead(400), phone: "+54 9 11 5111-1111",
      status: DriverStatus.ACTIVE, orgUnitId: baseNorte.id,
    },
  });
  const driverAna = await prisma.driver.create({
    data: {
      firstName: "Ana", lastName: "Gómez", documentId: "30987654", licenseNumber: "B-30987654",
      licenseCategory: "D1", licenseExpiry: daysAhead(120), phone: "+54 9 11 5222-2222",
      status: DriverStatus.ACTIVE, orgUnitId: baseNorte.id,
    },
  });
  const driverLuis = await prisma.driver.create({
    data: {
      firstName: "Luis", lastName: "Martínez", documentId: "26111222", licenseNumber: "B-26111222",
      licenseCategory: "E1", licenseExpiry: daysAhead(30), phone: "+54 9 11 5333-3333",
      status: DriverStatus.ACTIVE, orgUnitId: baseSur.id,
    },
  });
  const driverSofia = await prisma.driver.create({
    data: {
      firstName: "Sofía", lastName: "Díaz", documentId: "32444555", licenseNumber: "B-32444555",
      licenseCategory: "D2", licenseExpiry: daysAgo(10), phone: "+54 9 11 5444-4444",
      status: DriverStatus.SUSPENDED, orgUnitId: baseSur.id,
    },
  });

  // ---------------------------------------------------------------------------
  // 4. Usuarios (uno por rol)
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] usuarios…");
  const admin = await prisma.user.create({
    data: { email: "admin@flotas.local", name: "Administración Flotas", role: Role.ADMIN, passwordHash: password },
  });
  const supervisor = await prisma.user.create({
    data: {
      email: "supervisor@flotas.local", name: "Carlos Supervisor", role: Role.SUPERVISOR,
      passwordHash: password, orgUnitId: operaciones.id,
    },
  });
  const mesa = await prisma.user.create({
    data: {
      email: "mesa@flotas.local", name: "Mesa Operativa 24/7", role: Role.DESK_AGENT,
      passwordHash: password, orgUnitId: direccion.id,
    },
  });
  const chofer = await prisma.user.create({
    data: {
      email: "chofer@flotas.local", name: "Juan Pérez", role: Role.DRIVER,
      passwordHash: password, orgUnitId: baseNorte.id, driverId: driverJuan.id,
    },
  });
  const proveedor = await prisma.user.create({
    data: {
      email: "proveedor@flotas.local", name: "Taller Central", role: Role.SUPPLIER,
      passwordHash: password, supplierId: tallerCentral.id,
    },
  });

  // ---------------------------------------------------------------------------
  // 5. Vehículos + dispositivos Traccar + historial de estado
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] flota…");
  const vAB = await prisma.vehicle.create({
    data: {
      plate: "AB123CD", brand: "Toyota", model: "Hilux", year: 2022, type: "Camioneta",
      fuelType: FuelType.DIESEL, tankCapacityLiters: 80, odometerKm: 84500,
      status: VehicleStatus.ACTIVE, orgUnitId: baseNorte.id, currentDriverId: driverJuan.id,
    },
  });
  const vCD = await prisma.vehicle.create({
    data: {
      plate: "CD456EF", brand: "Ford", model: "Ranger", year: 2021, type: "Camioneta",
      fuelType: FuelType.DIESEL, tankCapacityLiters: 80, odometerKm: 112300,
      status: VehicleStatus.ACTIVE, orgUnitId: baseNorte.id, currentDriverId: driverAna.id,
    },
  });
  const vEF = await prisma.vehicle.create({
    data: {
      plate: "EF789GH", brand: "Volkswagen", model: "Amarok", year: 2020, type: "Camioneta",
      fuelType: FuelType.DIESEL, tankCapacityLiters: 80, odometerKm: 156700,
      status: VehicleStatus.IN_MAINTENANCE, orgUnitId: baseSur.id, currentDriverId: driverLuis.id,
    },
  });
  const vGH = await prisma.vehicle.create({
    data: {
      plate: "GH012IJ", brand: "Renault", model: "Kangoo", year: 2023, type: "Utilitario",
      fuelType: FuelType.NAFTA, tankCapacityLiters: 50, odometerKm: 34200,
      status: VehicleStatus.ACTIVE, orgUnitId: baseSur.id,
    },
  });
  const vIJ = await prisma.vehicle.create({
    data: {
      plate: "IJ345KL", brand: "Mercedes-Benz", model: "Sprinter", year: 2019, type: "Furgón",
      fuelType: FuelType.DIESEL, tankCapacityLiters: 100, odometerKm: 210400,
      status: VehicleStatus.OUT_OF_SERVICE, orgUnitId: baseSur.id,
    },
  });
  const vKL = await prisma.vehicle.create({
    data: {
      plate: "KL678MN", brand: "Fiat", model: "Cronos", year: 2023, type: "Sedán",
      fuelType: FuelType.NAFTA, tankCapacityLiters: 45, odometerKm: 18900,
      status: VehicleStatus.ACTIVE, orgUnitId: baseNorte.id,
    },
  });

  // Dispositivo Traccar en la unidad AB123CD (uniqueId que cita el README).
  // Se registra localmente; el worker lo sincroniza con Traccar (traccarId null).
  await prisma.traccarDevice.create({
    data: {
      vehicleId: vAB.id, uniqueId: "356938035643809", name: "GPS AB123CD",
      monitoringIntervalSeconds: 30, connectionStatus: DeviceConnectionStatus.ONLINE, lastSeenAt: hoursAgo(0.1),
    },
  });
  await prisma.traccarDevice.create({
    data: {
      vehicleId: vCD.id, uniqueId: "356938035643810", name: "GPS CD456EF",
      monitoringIntervalSeconds: 60, connectionStatus: DeviceConnectionStatus.OFFLINE, lastSeenAt: hoursAgo(6),
    },
  });
  await prisma.traccarDevice.create({
    data: {
      vehicleId: vGH.id, uniqueId: "356938035643811", name: "GPS GH012IJ",
      monitoringIntervalSeconds: 60, connectionStatus: DeviceConnectionStatus.UNKNOWN,
    },
  });

  // Historial de estado (el que salió de servicio deja rastro)
  await prisma.vehicleStatusHistory.create({
    data: { vehicleId: vEF.id, fromStatus: VehicleStatus.ACTIVE, toStatus: VehicleStatus.IN_MAINTENANCE, reason: "Service de 150.000 km", changedById: supervisor.id, createdAt: daysAgo(4) },
  });
  await prisma.vehicleStatusHistory.create({
    data: { vehicleId: vIJ.id, fromStatus: VehicleStatus.ACTIVE, toStatus: VehicleStatus.OUT_OF_SERVICE, reason: "Falla de motor a la espera de presupuesto", changedById: admin.id, createdAt: daysAgo(20) },
  });

  // ---------------------------------------------------------------------------
  // 6. Posiciones (para el mapa en vivo e histórico). Zona AMBA.
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] posiciones…");
  const tracks: Array<{ vehicle: typeof vAB; base: [number, number] }> = [
    { vehicle: vAB, base: [-34.552, -58.462] },
    { vehicle: vCD, base: [-34.603, -58.381] },
    { vehicle: vGH, base: [-34.705, -58.402] },
  ];
  for (const { vehicle, base } of tracks) {
    const rows = [];
    for (let i = 20; i >= 0; i--) {
      const jitter = (i % 5) * 0.0015;
      rows.push({
        vehicleId: vehicle.id,
        latitude: base[0] + jitter,
        longitude: base[1] + jitter * 0.8,
        speedKmh: i === 0 ? 0 : 20 + (i % 7) * 8,
        course: (i * 17) % 360,
        ignition: i !== 0,
        odometerKm: vehicle.odometerKm - i * 3,
        recordedAt: hoursAgo(i * 0.5),
        receivedAt: hoursAgo(i * 0.5),
        // Un tramo marcado como bufferizado (reconciliación offline)
        isBuffered: i >= 15 && i <= 17,
        attributes: { source: "seed-demo" },
      });
    }
    await prisma.positionSnapshot.createMany({ data: rows });
  }

  // ---------------------------------------------------------------------------
  // 7. Jornadas operativas (los 4 estados) + hijos
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] jornadas…");
  const jCompleted = await prisma.jornadaOperativa.create({
    data: {
      vehicleId: vAB.id, driverId: driverJuan.id, orgUnitId: baseNorte.id,
      purpose: "Reparto de insumos zona norte", plannedStart: daysAgo(2), plannedEnd: daysAgo(2),
      actualStart: daysAgo(2), actualEnd: daysAgo(2), startOdometerKm: 84200, endOdometerKm: 84500,
      status: JornadaStatus.COMPLETED, notes: "Sin novedades relevantes.", createdById: supervisor.id,
    },
  });
  const jInProgress = await prisma.jornadaOperativa.create({
    data: {
      vehicleId: vCD.id, driverId: driverAna.id, orgUnitId: baseNorte.id,
      purpose: "Traslado de personal a obra", plannedStart: hoursAgo(4), plannedEnd: hoursAgo(-2),
      actualStart: hoursAgo(4), startOdometerKm: 112300,
      status: JornadaStatus.IN_PROGRESS, createdById: supervisor.id,
    },
  });
  const jPlanned = await prisma.jornadaOperativa.create({
    data: {
      vehicleId: vGH.id, driverId: driverLuis.id, orgUnitId: baseSur.id,
      purpose: "Recolección de documentación", plannedStart: daysAhead(1), plannedEnd: daysAhead(1),
      status: JornadaStatus.PLANNED, createdById: supervisor.id,
    },
  });
  await prisma.jornadaOperativa.create({
    data: {
      vehicleId: vKL.id, driverId: driverSofia.id, orgUnitId: baseNorte.id,
      purpose: "Visita a proveedor (cancelada)", plannedStart: daysAgo(1), plannedEnd: daysAgo(1),
      status: JornadaStatus.CANCELLED, notes: "Cancelada por licencia del conductor.", createdById: supervisor.id,
    },
  });

  // Viáticos (los 4 estados)
  await prisma.viatico.createMany({
    data: [
      { jornadaId: jCompleted.id, driverId: driverJuan.id, concept: "Almuerzo en ruta", amount: 8500, status: ViaticoStatus.PAID, approvedById: supervisor.id, createdById: chofer.id },
      { jornadaId: jCompleted.id, driverId: driverJuan.id, concept: "Peaje autopista", amount: 3200, status: ViaticoStatus.APPROVED, approvedById: supervisor.id, createdById: chofer.id },
      { jornadaId: jInProgress.id, driverId: driverAna.id, concept: "Estacionamiento", amount: 2000, status: ViaticoStatus.REQUESTED, createdById: chofer.id },
      { jornadaId: jPlanned.id, driverId: driverLuis.id, concept: "Adelanto de combustible", amount: 15000, status: ViaticoStatus.REJECTED, approvedById: admin.id, createdById: supervisor.id },
    ],
  });

  // Permisos (los 3 estados)
  await prisma.permit.createMany({
    data: [
      { jornadaId: jCompleted.id, driverId: driverJuan.id, type: "Circulación nocturna", description: "Autorización para operar después de las 22h", status: PermitStatus.APPROVED, approvedById: supervisor.id, requestedById: chofer.id },
      { jornadaId: jInProgress.id, driverId: driverAna.id, type: "Ingreso a zona restringida", description: "Acceso a predio portuario", status: PermitStatus.PENDING, requestedById: chofer.id },
      { jornadaId: jPlanned.id, driverId: driverLuis.id, type: "Carga peligrosa", description: "Transporte de material inflamable", status: PermitStatus.REJECTED, approvedById: admin.id, requestedById: supervisor.id },
    ],
  });

  // Novedades
  await prisma.novedad.createMany({
    data: [
      { jornadaId: jCompleted.id, category: "Tránsito", description: "Demora por corte de avenida", occurredAt: daysAgo(2), reportedById: chofer.id },
      { jornadaId: jInProgress.id, category: "Clima", description: "Lluvia intensa, se reduce velocidad", occurredAt: hoursAgo(2), reportedById: chofer.id },
    ],
  });

  // Legajo de desempeño (append-only)
  await prisma.driverPerformanceRecord.createMany({
    data: [
      { driverId: driverJuan.id, kind: PerformanceKind.COMMENDATION, summary: "Conducción eficiente", details: "Menor consumo del mes en su base.", jornadaId: jCompleted.id, recordedById: supervisor.id },
      { driverId: driverSofia.id, kind: PerformanceKind.SANCTION, summary: "Suspensión preventiva", details: "Vencimiento de licencia no informado.", recordedById: admin.id },
      { driverId: driverAna.id, kind: PerformanceKind.TRAINING, summary: "Curso de manejo defensivo", recordedById: supervisor.id },
      { driverId: driverLuis.id, kind: PerformanceKind.OBSERVATION, summary: "Recordar checklist previo", recordedById: supervisor.id },
    ],
  });

  // ---------------------------------------------------------------------------
  // 8. Combustible — pasa por el motor de validación real
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] combustible…");
  async function createFuelLoad(input: {
    vehicle: typeof vAB; driverId: string | null; jornadaId: string | null;
    loadedAt: Date; liters: number; pricePerLiter: number; odometerKm: number;
    station: string; fuelType: FuelType; previous: Array<{ loadedAt: Date; liters: number; odometerKm: number }>;
    forceStatus?: FuelValidationStatus; reviewedById?: string; reviewNote?: string;
  }) {
    const { flags, status } = validateFuelLoad(
      { liters: input.liters, odometerKm: input.odometerKm, loadedAt: input.loadedAt, fuelType: input.fuelType },
      {
        tankCapacityLiters: input.vehicle.tankCapacityLiters ? Number(input.vehicle.tankCapacityLiters) : null,
        vehicleFuelType: input.vehicle.fuelType,
        previousLoads: input.previous,
      },
    );
    const finalStatus = input.forceStatus ?? (status === "FLAGGED" ? FuelValidationStatus.FLAGGED : FuelValidationStatus.VALID);
    return prisma.fuelLoad.create({
      data: {
        vehicleId: input.vehicle.id, driverId: input.driverId, jornadaId: input.jornadaId,
        loadedAt: input.loadedAt, liters: input.liters, pricePerLiter: input.pricePerLiter,
        totalCost: Math.round(input.liters * input.pricePerLiter * 100) / 100,
        odometerKm: input.odometerKm, station: input.station, fuelType: input.fuelType,
        validationStatus: finalStatus, validationFlags: flags,
        reviewedById: input.reviewedById, reviewNote: input.reviewNote, createdById: chofer.id,
      },
    });
  }

  // Carga normal → VALID
  await createFuelLoad({
    vehicle: vAB, driverId: driverJuan.id, jornadaId: jCompleted.id, loadedAt: daysAgo(2),
    liters: 62.5, pricePerLiter: 1150, odometerKm: 84300, station: "YPF Panamericana", fuelType: FuelType.DIESEL,
    previous: [{ loadedAt: daysAgo(9), liters: 58, odometerKm: 83800 }],
  });
  // Excede capacidad → FLAGGED
  await createFuelLoad({
    vehicle: vCD, driverId: driverAna.id, jornadaId: jInProgress.id, loadedAt: hoursAgo(3),
    liters: 95, pricePerLiter: 1150, odometerKm: 112250, station: "Shell Libertador", fuelType: FuelType.DIESEL,
    previous: [{ loadedAt: daysAgo(7), liters: 60, odometerKm: 111500 }],
  });
  // Tipo de combustible distinto + revisada y rechazada
  await createFuelLoad({
    vehicle: vGH, driverId: driverLuis.id, jornadaId: null, loadedAt: daysAgo(1),
    liters: 40, pricePerLiter: 1080, odometerKm: 34100, station: "Axion Sur", fuelType: FuelType.DIESEL,
    previous: [], forceStatus: FuelValidationStatus.REJECTED, reviewedById: supervisor.id,
    reviewNote: "Cargó diésel en un vehículo a nafta: error de carga, se rechaza.",
  });
  // Pendiente de revisión
  await createFuelLoad({
    vehicle: vKL, driverId: null, jornadaId: null, loadedAt: hoursAgo(20),
    liters: 38, pricePerLiter: 1090, odometerKm: 18850, station: "Puma Norte", fuelType: FuelType.NAFTA,
    previous: [], forceStatus: FuelValidationStatus.PENDING,
  });

  // ---------------------------------------------------------------------------
  // 9. Neumáticos + movimientos
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] neumáticos…");
  const tire1 = await prisma.tire.create({
    data: { serialNumber: "TYR-0001", brand: "Michelin", model: "Agilis", size: "225/75 R16", status: TireStatus.MOUNTED, currentVehicleId: vAB.id, currentPosition: "Delantero izquierdo", treadDepthMm: 7.5 },
  });
  const tire2 = await prisma.tire.create({
    data: { serialNumber: "TYR-0002", brand: "Michelin", model: "Agilis", size: "225/75 R16", status: TireStatus.MOUNTED, currentVehicleId: vAB.id, currentPosition: "Delantero derecho", treadDepthMm: 7.2 },
  });
  await prisma.tire.create({
    data: { serialNumber: "TYR-0003", brand: "Pirelli", model: "Scorpion", size: "265/65 R17", status: TireStatus.IN_STOCK, treadDepthMm: 9.0 },
  });
  const tire4 = await prisma.tire.create({
    data: { serialNumber: "TYR-0004", brand: "Bridgestone", model: "Dueler", size: "225/75 R16", status: TireStatus.IN_REPAIR, treadDepthMm: 4.1 },
  });
  const tire5 = await prisma.tire.create({
    data: { serialNumber: "TYR-0005", brand: "Firestone", model: "Destination", size: "205/70 R15", status: TireStatus.DISCARDED, treadDepthMm: 1.2 },
  });
  await prisma.tireMovement.createMany({
    data: [
      { tireId: tire1.id, type: TireMovementType.MOUNT, vehicleId: vAB.id, toPosition: "Delantero izquierdo", odometerKm: 80000, performedById: supervisor.id, createdAt: daysAgo(60) },
      { tireId: tire2.id, type: TireMovementType.MOUNT, vehicleId: vAB.id, toPosition: "Delantero derecho", odometerKm: 80000, performedById: supervisor.id, createdAt: daysAgo(60) },
      { tireId: tire1.id, type: TireMovementType.ROTATE, vehicleId: vAB.id, fromPosition: "Trasero izquierdo", toPosition: "Delantero izquierdo", odometerKm: 82000, performedById: supervisor.id, createdAt: daysAgo(20) },
      { tireId: tire4.id, type: TireMovementType.REPAIR, notes: "Pinchadura reparable", performedById: admin.id, createdAt: daysAgo(5) },
      { tireId: tire5.id, type: TireMovementType.DISCARD, notes: "Banda de rodamiento al límite legal", performedById: admin.id, createdAt: daysAgo(3) },
    ],
  });

  // ---------------------------------------------------------------------------
  // 10. Activos auxiliares + movimientos
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] activos auxiliares…");
  const asset1 = await prisma.auxiliaryAsset.create({
    data: { code: "GPS-EXT-001", name: "Handy VHF Motorola", category: "Comunicaciones", status: AuxAssetStatus.ASSIGNED, currentVehicleId: vAB.id },
  });
  const asset2 = await prisma.auxiliaryAsset.create({
    data: { code: "MAT-001", name: "Matafuego ABC 5kg", category: "Seguridad", status: AuxAssetStatus.ASSIGNED, currentVehicleId: vCD.id },
  });
  await prisma.auxiliaryAsset.create({
    data: { code: "KIT-001", name: "Kit de primeros auxilios", category: "Seguridad", status: AuxAssetStatus.IN_STOCK },
  });
  const asset4 = await prisma.auxiliaryAsset.create({
    data: { code: "GATO-001", name: "Gato hidráulico 3t", category: "Herramientas", status: AuxAssetStatus.IN_REPAIR },
  });
  await prisma.auxiliaryAssetMovement.createMany({
    data: [
      { assetId: asset1.id, type: AuxAssetMovementType.ASSIGN, vehicleId: vAB.id, notes: "Asignado a unidad de reparto", performedById: supervisor.id, createdAt: daysAgo(30) },
      { assetId: asset2.id, type: AuxAssetMovementType.ASSIGN, vehicleId: vCD.id, performedById: supervisor.id, createdAt: daysAgo(25) },
      { assetId: asset4.id, type: AuxAssetMovementType.REPAIR, notes: "Pérdida de presión", performedById: admin.id, createdAt: daysAgo(2) },
    ],
  });

  // ---------------------------------------------------------------------------
  // 11. Incidencias + notas + adjuntos + órdenes a proveedores
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] incidencias y órdenes…");
  const incFrenos = await prisma.incident.create({
    data: {
      vehicleId: vEF.id, jornadaId: null, driverId: driverLuis.id,
      title: "Ruido en el sistema de frenos", description: "Se escucha un chirrido metálico al frenar en la unidad EF789GH.",
      category: "Mecánica", urgency: IncidentUrgency.HIGH, status: IncidentStatus.WAITING_SUPPLIER,
      occurredAt: daysAgo(5), reportedById: supervisor.id,
    },
  });
  const incVidrio = await prisma.incident.create({
    data: {
      vehicleId: vCD.id, jornadaId: jInProgress.id, driverId: driverAna.id,
      title: "Rotura de parabrisas", description: "Impacto de piedra en autopista, fisura en el lado del conductor.",
      category: "Cristalería", urgency: IncidentUrgency.MEDIUM, status: IncidentStatus.OPEN,
      occurredAt: hoursAgo(3), reportedById: chofer.id,
    },
  });
  const incMotor = await prisma.incident.create({
    data: {
      vehicleId: vIJ.id, title: "Falla de motor", description: "El motor se apaga en ralentí. Unidad fuera de servicio.",
      category: "Mecánica", urgency: IncidentUrgency.CRITICAL, status: IncidentStatus.RESOLVED,
      occurredAt: daysAgo(20), resolvedAt: daysAgo(6), reportedById: admin.id,
    },
  });
  await prisma.incidentNote.createMany({
    data: [
      { incidentId: incFrenos.id, authorId: supervisor.id, body: "Se despacha a Taller Central para revisión.", createdAt: daysAgo(4) },
      { incidentId: incFrenos.id, authorId: proveedor.id, body: "Recibido. Se agenda para el jueves.", createdAt: daysAgo(3) },
      { incidentId: incMotor.id, authorId: admin.id, body: "Motor reparado y probado. Se cierra.", createdAt: daysAgo(6) },
    ],
  });
  await prisma.incidentAttachment.create({
    data: { incidentId: incVidrio.id, filename: "parabrisas.jpg", mimeType: "image/jpeg", sizeBytes: 245000, storageKey: "demo/parabrisas.jpg", uploadedById: chofer.id },
  });

  await prisma.supplierServiceOrder.create({
    data: {
      supplierId: tallerCentral.id, incidentId: incFrenos.id, vehicleId: vEF.id,
      title: "Cambio de pastillas y discos de freno", description: "Revisión completa del sistema de frenos delantero y trasero.",
      status: ServiceOrderStatus.IN_PROGRESS, costEstimate: 180000, scheduledFor: daysAhead(1),
      createdById: supervisor.id,
      notes: { create: [{ authorId: supervisor.id, body: "Presupuesto aprobado." }] },
    },
  });
  await prisma.supplierServiceOrder.create({
    data: {
      supplierId: gomeria.id, vehicleId: vAB.id,
      title: "Rotación y balanceo de neumáticos", description: "Rotación de las 4 cubiertas y balanceo.",
      status: ServiceOrderStatus.COMPLETED, costEstimate: 45000, costFinal: 45000, completedAt: daysAgo(20),
      createdById: admin.id,
    },
  });
  await prisma.supplierServiceOrder.create({
    data: {
      supplierId: tallerCentral.id, incidentId: incMotor.id, vehicleId: vIJ.id,
      title: "Reparación integral de motor", description: "Reemplazo de bomba de combustible y sensores.",
      status: ServiceOrderStatus.SENT, costEstimate: 950000, createdById: admin.id,
    },
  });

  // ---------------------------------------------------------------------------
  // 12. Geocercas
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] geocercas…");
  await prisma.geofence.create({
    data: {
      name: "Predio Base Norte", description: "Perímetro del depósito de la Base Norte", orgUnitId: baseNorte.id,
      active: true, createdById: supervisor.id,
      polygon: [[-34.548, -58.466], [-34.548, -58.458], [-34.556, -58.458], [-34.556, -58.466]],
    },
  });
  await prisma.geofence.create({
    data: {
      name: "Zona restringida puerto", description: "Área que requiere permiso de acceso", orgUnitId: baseSur.id,
      active: true, createdById: admin.id,
      polygon: [[-34.700, -58.410], [-34.700, -58.395], [-34.712, -58.395], [-34.712, -58.410]],
    },
  });

  // ---------------------------------------------------------------------------
  // 13. Alertas + notificaciones
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] alertas…");
  const alertSpeed = await prisma.alert.create({
    data: {
      type: AlertType.SPEEDING, severity: AlertSeverity.WARNING, status: AlertStatus.NEW,
      vehicleId: vAB.id, message: "Exceso de velocidad: 138 km/h en zona de 120",
      details: { speedKmh: 138, limitKmh: 120 }, occurredAt: hoursAgo(5),
    },
  });
  await prisma.alert.create({
    data: {
      type: AlertType.DEVICE_DISCONNECTED, severity: AlertSeverity.WARNING, status: AlertStatus.ACKNOWLEDGED,
      vehicleId: vCD.id, message: "Dispositivo GPS CD456EF sin reportar por más de 3 intervalos",
      occurredAt: hoursAgo(6), acknowledgedById: mesa.id, acknowledgedAt: hoursAgo(5),
    },
  });
  await prisma.alert.create({
    data: {
      type: AlertType.UNAUTHORIZED_MOVEMENT, severity: AlertSeverity.CRITICAL, status: AlertStatus.RESOLVED,
      vehicleId: vGH.id, message: "Movimiento detectado sin jornada activa",
      details: { speedKmh: 24 }, occurredAt: daysAgo(1),
    },
  });
  await prisma.alertNotificationLog.createMany({
    data: [
      { alertId: alertSpeed.id, channel: NotificationChannel.EMAIL, recipient: "supervisor@flotas.local", status: NotificationStatus.SENT, sentAt: hoursAgo(5) },
      { alertId: alertSpeed.id, channel: NotificationChannel.SMS, recipient: "+54 9 11 5111-1111", status: NotificationStatus.PENDING },
    ],
  });

  // ---------------------------------------------------------------------------
  // 14. Definiciones de reporte + corridas
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] reportes…");
  const repFlota = await prisma.reportDefinition.create({
    data: {
      name: "Flota activa por base", description: "Vehículos activos agrupados por unidad", dataset: ReportDataset.VEHICLES,
      columns: ["plate", "brand", "model", "status", "orgUnit"], filters: { status: "ACTIVE" }, createdById: admin.id,
    },
  });
  const repComb = await prisma.reportDefinition.create({
    data: {
      name: "Cargas observadas del mes", description: "Combustible con validación FLAGGED/REJECTED", dataset: ReportDataset.FUEL_LOADS,
      columns: ["vehicle", "liters", "totalCost", "validationStatus", "loadedAt"], filters: {}, createdById: supervisor.id,
    },
  });
  await prisma.reportRun.create({
    data: { reportDefinitionId: repFlota.id, format: ReportFormat.PDF, status: ReportRunStatus.COMPLETED, filters: { status: "ACTIVE" }, rowCount: 4, resultStorageKey: "demo/reporte-flota.pdf", requestedById: admin.id, completedAt: daysAgo(1) },
  });
  await prisma.reportRun.create({
    data: { reportDefinitionId: repComb.id, format: ReportFormat.XLSX, status: ReportRunStatus.QUEUED, filters: {}, requestedById: supervisor.id },
  });

  // ---------------------------------------------------------------------------
  // 15. Mesa 24/7 — tickets + notas
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] mesa 24/7…");
  const ticket1 = await prisma.deskTicket.create({
    data: {
      channel: DeskChannel.PHONE, subject: "Conductor reporta ruido de frenos", description: "Llamado del conductor de EF789GH sobre chirrido al frenar.",
      status: DeskTicketStatus.RESOLVED, priority: IncidentUrgency.HIGH, requesterName: "Luis Martínez", requesterContact: "+54 9 11 5333-3333",
      vehicleId: vEF.id, linkedIncidentId: incFrenos.id, assignedToId: mesa.id, createdById: mesa.id,
    },
  });
  await prisma.deskTicket.create({
    data: {
      channel: DeskChannel.EMAIL, subject: "Solicitud de reserva de vehículo", description: "Pedido de una unidad para el viernes.",
      status: DeskTicketStatus.OPEN, priority: IncidentUrgency.LOW, requesterName: "Área de Compras", requesterContact: "compras@flotas.local",
      createdById: mesa.id,
    },
  });
  await prisma.deskTicketNote.createMany({
    data: [
      { ticketId: ticket1.id, authorId: mesa.id, body: "Se genera incidencia y se despacha a taller." },
      { ticketId: ticket1.id, authorId: mesa.id, body: "Conductor notificado del turno." },
    ],
  });

  // ---------------------------------------------------------------------------
  // 16. Catálogos editables (overrides de ejemplo)
  // ---------------------------------------------------------------------------
  console.log("[seed:demo] catálogos…");
  // Catálogos "libres" (ABM completo): las claves deben coincidir con
  // lib/catalogs/registry.ts (VEHICLE_BRAND, VEHICLE_TYPE, …).
  await prisma.catalogItem.createMany({
    data: [
      { catalog: "VEHICLE_BRAND", code: "toyota", label: "Toyota", sortOrder: 1 },
      { catalog: "VEHICLE_BRAND", code: "ford", label: "Ford", sortOrder: 2 },
      { catalog: "VEHICLE_BRAND", code: "vw", label: "Volkswagen", sortOrder: 3 },
      { catalog: "VEHICLE_BRAND", code: "renault", label: "Renault", sortOrder: 4 },
      { catalog: "VEHICLE_BRAND", code: "mercedes", label: "Mercedes-Benz", sortOrder: 5 },
      { catalog: "VEHICLE_BRAND", code: "fiat", label: "Fiat", sortOrder: 6 },
      { catalog: "VEHICLE_TYPE", code: "camioneta", label: "Camioneta", sortOrder: 1 },
      { catalog: "VEHICLE_TYPE", code: "furgon", label: "Furgón", sortOrder: 2 },
      { catalog: "VEHICLE_TYPE", code: "sedan", label: "Sedán", sortOrder: 3 },
      { catalog: "VEHICLE_TYPE", code: "utilitario", label: "Utilitario", sortOrder: 4 },
      { catalog: "INCIDENT_CATEGORY", code: "mecanica", label: "Mecánica", sortOrder: 1 },
      { catalog: "INCIDENT_CATEGORY", code: "cristaleria", label: "Cristalería", sortOrder: 2 },
      { catalog: "INCIDENT_CATEGORY", code: "electrica", label: "Eléctrica", sortOrder: 3 },
      { catalog: "LICENSE_CATEGORY", code: "d1", label: "D1", sortOrder: 1 },
      { catalog: "LICENSE_CATEGORY", code: "d2", label: "D2", sortOrder: 2 },
      { catalog: "LICENSE_CATEGORY", code: "e1", label: "E1", sortOrder: 3 },
      { catalog: "FUEL_STATION", code: "ypf", label: "YPF", sortOrder: 1 },
      { catalog: "FUEL_STATION", code: "shell", label: "Shell", sortOrder: 2 },
      { catalog: "FUEL_STATION", code: "axion", label: "Axion", sortOrder: 3 },
    ],
  });

  const counts = {
    orgUnits: await prisma.orgUnit.count(),
    users: await prisma.user.count(),
    drivers: await prisma.driver.count(),
    vehicles: await prisma.vehicle.count(),
    devices: await prisma.traccarDevice.count(),
    positions: await prisma.positionSnapshot.count(),
    jornadas: await prisma.jornadaOperativa.count(),
    fuelLoads: await prisma.fuelLoad.count(),
    tires: await prisma.tire.count(),
    assets: await prisma.auxiliaryAsset.count(),
    incidents: await prisma.incident.count(),
    serviceOrders: await prisma.supplierServiceOrder.count(),
    geofences: await prisma.geofence.count(),
    alerts: await prisma.alert.count(),
    reports: await prisma.reportDefinition.count(),
    deskTickets: await prisma.deskTicket.count(),
  };
  console.log("[seed:demo] OK. Filas creadas:", counts);
  console.log("[seed:demo] Login: admin@ / supervisor@ / chofer@ / proveedor@ / mesa@ flotas.local (pass: SEED_PASSWORD)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
