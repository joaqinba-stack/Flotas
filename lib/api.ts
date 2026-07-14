import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "@/lib/errors";

type Handler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response>;

export function apiHandler<Ctx>(fn: Handler<Ctx>): Handler<Ctx> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Datos inválidos", issues: err.flatten().fieldErrors },
          { status: 422 },
        );
      }
      console.error(err);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
  };
}
