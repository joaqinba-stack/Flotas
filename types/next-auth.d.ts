import type { Role } from "@/lib/data/types";

declare module "next-auth" {
  interface User {
    id?: string;
    role: Role;
    orgUnitId: string | null;
    orgPath: string | null;
    driverId: string | null;
    supplierId: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      orgUnitId: string | null;
      orgPath: string | null;
      driverId: string | null;
      supplierId: string | null;
    };
  }
}
