import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role, ServiceOrderStatus } from "@/lib/data/types";
import { listServiceOrders, createServiceOrder } from "@/lib/data/supplier-orders";
import { serviceOrderInputSchema } from "@/lib/validation/inputs";

export const GET = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.SUPPLIER);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  return json(
    await listServiceOrders(session, {
      status: status && status in ServiceOrderStatus ? (status as ServiceOrderStatus) : undefined,
      supplierId: url.searchParams.get("supplierId") ?? undefined,
    }),
  );
});

export const POST = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const input = serviceOrderInputSchema.parse(await req.json());
  return json(await createServiceOrder(session, input), { status: 201 });
});
