import { redirect } from "next/navigation";
import { requireSession, homePathFor } from "@/lib/auth/session";

export default async function Home() {
  const session = await requireSession();
  redirect(homePathFor(session.role));
}
