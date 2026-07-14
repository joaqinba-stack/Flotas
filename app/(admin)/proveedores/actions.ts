"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import { supplierInputSchema, supplierLoginSchema } from "@/lib/validation/inputs";
import { createSupplier, updateSupplier } from "@/lib/data/suppliers";

export async function createSupplierAction(formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: "/proveedores/nuevo", revalidate: ["/proveedores"] }, async () => {
    const raw = formDataToObject(formData);
    const input = supplierInputSchema.parse({ ...raw, active: raw.active ?? "true" });
    const login = raw.loginEmail
      ? supplierLoginSchema.parse({ email: raw.loginEmail, password: raw.loginPassword })
      : undefined;
    const supplier = await createSupplier(session, input, login);
    return `/proveedores/${supplier.id}`;
  });
}

export async function updateSupplierAction(id: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/proveedores/${id}`, revalidate: ["/proveedores", `/proveedores/${id}`] },
    async () => {
      const raw = formDataToObject(formData);
      const input = supplierInputSchema.parse(raw);
      await updateSupplier(session, id, input);
      return `/proveedores/${id}`;
    },
  );
}
