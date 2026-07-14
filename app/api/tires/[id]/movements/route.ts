import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { registerTireMovement } from "@/lib/data/tires";
import { tireMovementSchema } from "@/lib/validation/inputs";

type Ctx = { params: Promise<{ id: string }> };

export const POST = apiHandler<Ctx>(async (req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const { id } = await params;
  const input = tireMovementSchema.parse(await req.json());
  return json(await registerTireMovement(session, id, input), { status: 201 });
});
