import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { authConfig } from "./config";
import { findUserForAuth } from "@/lib/data/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await findUserForAuth(email);
        if (!user || !user.active) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          orgUnitId: user.orgUnitId,
          orgPath: user.orgUnit?.path ?? null,
          driverId: user.driverId,
          supplierId: user.supplierId,
        };
      },
    }),
  ],
});
