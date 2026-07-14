import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getFuelLoad, reviewFuelLoad } from "@/lib/data/fuel-loads";
import { fuelReviewSchema } from "@/lib/validation/inputs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler<Ctx>(async (_req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.DRIVER);
  const { id } = await params;
  return json(await getFuelLoad(session, id));
});

export const PATCH = apiHandler<Ctx>(async (req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const { id } = await params;
  const input = fuelReviewSchema.parse(await req.json());
  return json(await reviewFuelLoad(session, id, input.decision, input.note));
});
