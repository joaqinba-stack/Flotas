import { PrismaClient, Role, OrgUnitKind } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function upsertOrgUnit(
  name: string,
  kind: OrgUnitKind,
  parent?: { id: string; path: string },
) {
  const existing = await prisma.orgUnit.findFirst({ where: { name, parentId: parent?.id ?? null } });
  if (existing) return existing;
  const id = randomUUID();
  return prisma.orgUnit.create({
    data: {
      id,
      name,
      kind,
      parentId: parent?.id ?? null,
      path: `${parent?.path ?? "/"}${id}/`,
    },
  });
}

async function main() {
  const password = await hash(process.env.SEED_PASSWORD ?? "flotas123", 10);

  const direccion = await upsertOrgUnit("Dirección General de Movilidad", OrgUnitKind.DIRECCION);
  const operaciones = await upsertOrgUnit("Departamento Operaciones", OrgUnitKind.DEPARTAMENTO, direccion);
  const mantenimiento = await upsertOrgUnit("Departamento Mantenimiento", OrgUnitKind.DEPARTAMENTO, direccion);
  const baseNorte = await upsertOrgUnit("Base Logística Norte", OrgUnitKind.BASE_LOGISTICA, operaciones);
  const baseSur = await upsertOrgUnit("Base Logística Sur", OrgUnitKind.BASE_LOGISTICA, operaciones);

  const supplier = await prisma.supplier.upsert({
    where: { taxId: "30-11111111-1" },
    update: {},
    create: {
      name: "Taller Mecánico Central SRL",
      taxId: "30-11111111-1",
      serviceTypes: "Mecánica general, electricidad, gomería",
      contactName: "Carlos Gómez",
      contactEmail: "contacto@tallercentral.com",
      contactPhone: "+54 11 4444-5555",
    },
  });

  const driver = await prisma.driver.upsert({
    where: { documentId: "28111222" },
    update: {},
    create: {
      firstName: "Juan",
      lastName: "Pérez",
      documentId: "28111222",
      licenseNumber: "B-28111222",
      licenseCategory: "D1",
      licenseExpiry: new Date("2027-06-30"),
      phone: "+54 11 5555-1111",
      orgUnitId: baseNorte.id,
    },
  });

  const users: Array<{
    email: string;
    name: string;
    role: Role;
    orgUnitId?: string;
    driverId?: string;
    supplierId?: string;
  }> = [
    { email: "admin@flotas.local", name: "Administración Flotas", role: Role.ADMIN, orgUnitId: direccion.id },
    { email: "supervisor@flotas.local", name: "Supervisor Operaciones", role: Role.SUPERVISOR, orgUnitId: operaciones.id },
    { email: "chofer@flotas.local", name: "Juan Pérez", role: Role.DRIVER, orgUnitId: baseNorte.id, driverId: driver.id },
    { email: "proveedor@flotas.local", name: "Taller Mecánico Central", role: Role.SUPPLIER, supplierId: supplier.id },
    { email: "mesa@flotas.local", name: "Agente Mesa 24/7", role: Role.DESK_AGENT, orgUnitId: direccion.id },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, orgUnitId: u.orgUnitId ?? null, driverId: u.driverId ?? null, supplierId: u.supplierId ?? null },
      create: {
        email: u.email,
        name: u.name,
        passwordHash: password,
        role: u.role,
        orgUnitId: u.orgUnitId ?? null,
        driverId: u.driverId ?? null,
        supplierId: u.supplierId ?? null,
      },
    });
  }

  console.log("Seed base OK:", {
    orgUnits: [direccion.name, operaciones.name, mantenimiento.name, baseNorte.name, baseSur.name],
    users: users.map((u) => u.email),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
