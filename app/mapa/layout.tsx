import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { Sidebar } from "@/components/sidebar";

export default async function MapaLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(Role.SUPERVISOR, Role.DESK_AGENT);
  return (
    <div className="app-shell">
      <Sidebar session={session} />
      <main className="main" style={{ maxWidth: "none" }}>{children}</main>
    </div>
  );
}
