import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getServiceOrder } from "@/lib/data/supplier-orders";
import { OrderDetail } from "@/components/order-detail";

export default async function MiOrdenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPPLIER);
  const { id } = await params;
  const [order, sp] = await Promise.all([getServiceOrder(session, id), searchParams]);
  return (
    <div>
      {sp.error && <p className="alert-error">{sp.error}</p>}
      <OrderDetail order={order} basePath={`/proveedor/ordenes/${id}`} viewerIsSupplier />
    </div>
  );
}
