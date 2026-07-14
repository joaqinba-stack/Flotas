import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/lib/data/types";

type TokenClaims = {
  userId: string;
  role: Role;
  orgUnitId: string | null;
  orgPath: string | null;
  driverId: string | null;
  supplierId: string | null;
};

// Config compartida entre middleware (edge, sin Prisma) y el server completo.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const claims: TokenClaims = {
          userId: user.id!,
          role: user.role,
          orgUnitId: user.orgUnitId,
          orgPath: user.orgPath,
          driverId: user.driverId,
          supplierId: user.supplierId,
        };
        Object.assign(token, claims);
      }
      return token;
    },
    session({ session, token }) {
      const claims = token as unknown as TokenClaims;
      session.user.id = claims.userId;
      session.user.role = claims.role;
      session.user.orgUnitId = claims.orgUnitId;
      session.user.orgPath = claims.orgPath;
      session.user.driverId = claims.driverId;
      session.user.supplierId = claims.supplierId;
      return session;
    },
  },
} satisfies NextAuthConfig;
