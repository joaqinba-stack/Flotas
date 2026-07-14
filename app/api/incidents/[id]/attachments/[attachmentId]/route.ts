import { apiHandler } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getIncidentAttachment } from "@/lib/data/incidents";
import { readUpload } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string; attachmentId: string }> };

export const GET = apiHandler<Ctx>(async (_req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.DRIVER);
  const { id, attachmentId } = await params;
  const attachment = await getIncidentAttachment(session, id, attachmentId);
  const data = await readUpload(attachment.storageKey);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
      "Content-Length": String(attachment.sizeBytes),
    },
  });
});
