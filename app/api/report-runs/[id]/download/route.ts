import { apiHandler } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { downloadReportRun } from "@/lib/data/reports";

type Ctx = { params: Promise<{ id: string }> };

const CONTENT_TYPES: Record<string, string> = {
  PDF: "application/pdf",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  CSV: "text/csv",
};

export const GET = apiHandler<Ctx>(async (_req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const { id } = await params;
  const { run, data } = await downloadReportRun(session, id);
  const extension = run.format.toLowerCase();
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": CONTENT_TYPES[run.format] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${run.reportDefinition.name.replace(/[^\w.\-]/g, "_")}.${extension}"`,
    },
  });
});
