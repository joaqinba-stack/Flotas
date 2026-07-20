import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// Seed mínimo: solo la cuenta de administración inicial. Todo lo demás
// (organigrama, vehículos, conductores, proveedores, usuarios) se carga desde
// la propia aplicación.
async function main() {
  const password = await hash(process.env.SEED_PASSWORD ?? "flotas123", 10);

  await prisma.user.upsert({
    where: { email: "admin@flotas.local" },
    update: {},
    create: {
      email: "admin@flotas.local",
      name: "Administración Flotas",
      role: Role.ADMIN,
      passwordHash: password,
    },
  });

  console.log("Seed OK: admin@flotas.local (password: SEED_PASSWORD)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
