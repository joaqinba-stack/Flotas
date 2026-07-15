import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role, AlertStatus, AlertType, AlertSeverity } from "@/lib/data/types";
import { listAlerts } from "@/lib/data/alerts";

export const GET = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.DRIVER);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");
  const severity = url.searchParams.get("severity");
  return json(
    await listAlerts(session, {
      status: status && status in AlertStatus ? (status as AlertStatus) : undefined,
      type: type && type in AlertType ? (type as AlertType) : undefined,
      severity: severity && severity in AlertSeverity ? (severity as AlertSeverity) : undefined,
      vehicleId: url.searchParams.get("vehicleId") ?? undefined,
    }),
  );
});
