import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { Sidebar } from "@/components/sidebar";

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(Role.SUPPLIER);
  return (
    <div className="app-shell">
      <Sidebar session={session} />
      <main className="main">{children}</main>
    </div>
  );
}
