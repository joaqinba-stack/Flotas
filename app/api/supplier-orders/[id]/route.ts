import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getServiceOrder, updateServiceOrderStatus } from "@/lib/data/supplier-orders";
import { serviceOrderStatusSchema } from "@/lib/validation/inputs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler<Ctx>(async (_req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.SUPPLIER);
  const { id } = await params;
  return json(await getServiceOrder(session, id));
});

export const PATCH = apiHandler<Ctx>(async (req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.SUPPLIER);
  const { id } = await params;
  const input = serviceOrderStatusSchema.parse(await req.json());
  return json(await updateServiceOrderStatus(session, id, input.toStatus, input.costFinal));
});
