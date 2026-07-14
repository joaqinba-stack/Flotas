import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { SupplierForm } from "@/components/supplier-form";
import { createSupplierAction } from "../actions";

export default async function NuevoProveedorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSession(Role.SUPERVISOR);
  const params = await searchParams;
  return (
    <div>
      <h1>Nuevo proveedor</h1>
      {params.error && <p className="alert-error">{params.error}</p>}
      <div className="card">
        <SupplierForm action={createSupplierAction} />
      </div>
    </div>
  );
}
